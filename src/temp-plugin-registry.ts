import type {
  App,
  Plugin as ObsidianPlugin
} from 'obsidian';
import type { ActiveFileProvider } from 'obsidian-dev-utils/obsidian/active-file-provider';
import type { CommandRegistrar } from 'obsidian-dev-utils/obsidian/command-registrar';
import type { MenuEventRegistrar } from 'obsidian-dev-utils/obsidian/menu-event-registrar';

import {
  Component,
  Notice
} from 'obsidian';
import { invokeAsyncSafely } from 'obsidian-dev-utils/async';
import { printError } from 'obsidian-dev-utils/error';
import { CommandHandlerComponent } from 'obsidian-dev-utils/obsidian/command-handlers/command-handler-component';

import type {
  RegisterTempPluginParams,
  TempPluginClass
} from './code-button-context.ts';

import { UnloadTempPluginCommandHandler } from './command-handlers/unload-temp-plugin-command-handler.ts';

type LoadFn = () => Promise<void>;

const DEFAULT_TEMP_PLUGIN_CLASS_NAME = '_AnonymousPlugin';

interface TempPluginRegistryConstructorParams {
  readonly activeFileProvider: ActiveFileProvider;
  readonly app: App;
  readonly commandRegistrar: CommandRegistrar;
  readonly menuEventRegistrar: MenuEventRegistrar;
  readonly pluginName: string;
}

export class TempPluginRegistry extends Component {
  private readonly activeFileProvider: ActiveFileProvider;
  private readonly app: App;
  private readonly commandRegistrar: CommandRegistrar;
  private readonly menuEventRegistrar: MenuEventRegistrar;
  private readonly pluginName: string;
  private readonly tempPlugins = new Map<string, ObsidianPlugin>();

  public constructor(params: TempPluginRegistryConstructorParams) {
    super();
    this.app = params.app;
    this.pluginName = params.pluginName;
    this.commandRegistrar = params.commandRegistrar;
    this.menuEventRegistrar = params.menuEventRegistrar;
    this.activeFileProvider = params.activeFileProvider;
  }

  public getTempPlugin(tempPluginClass: string | TempPluginClass): null | ObsidianPlugin {
    const tempPluginClassName = getTempPluginClassName(tempPluginClass);
    const id = makeTempPluginId(tempPluginClassName);
    return this.tempPlugins.get(id) ?? null;
  }

  public async registerTempPlugin<TPlugin extends ObsidianPlugin = ObsidianPlugin>(params: RegisterTempPluginParams<TPlugin>): Promise<null | TPlugin> {
    const tempPluginClassName = getTempPluginClassName(params.tempPluginClass);
    const id = makeTempPluginId(tempPluginClassName);

    const existingPlugin = this.tempPlugins.get(id);
    if (existingPlugin) {
      existingPlugin.unload();
    }

    const tempPlugin = new params.tempPluginClass(this.app, {
      author: '__Temp Plugin created by CodeScript Toolkit',
      description: '__Temp Plugin created by CodeScript Toolkit',
      id,
      minAppVersion: '0.0.1',
      name: `__Temp Plugin ${tempPluginClassName}`,
      version: '0.0.0'
    });

    this.tempPlugins.set(id, tempPlugin);

    let styleEl: HTMLStyleElement | null = null;
    const unloadTempPluginCommandHandler = new UnloadTempPluginCommandHandler({
      tempPlugin,
      tempPluginClassName
    });
    const unloadTempPluginCommandHandlerComponent = this.addChild(
      new CommandHandlerComponent({
        activeFileProvider: this.activeFileProvider,
        commandHandlers: [unloadTempPluginCommandHandler],
        commandRegistrar: this.commandRegistrar,
        menuEventRegistrar: this.menuEventRegistrar,
        pluginName: this.pluginName
      })
    );

    const originalUnload = tempPlugin.unload.bind(tempPlugin);
    tempPlugin.unload = (): void => {
      tempPluginUnload(true);
      try {
        originalUnload();
      } catch (error) {
        new Notice(`Failed to unload Temp Plugin: ${tempPluginClassName}. See console for details.`);
        printError(error);
      }
    };

    const loadFn = tempPlugin.load.bind(tempPlugin) as LoadFn;
    const PLUGIN_HANG_TIMEOUT = 3000;
    let hangNotice: Notice | null = null;

    let isLoading = true;
    const that = this;
    invokeAsyncSafely(reportHang);

    try {
      await loadFn();
      tempPluginLoad();
    } catch (error) {
      new Notice(`Failed to load Temp Plugin: ${tempPluginClassName}. See console for details.`);
      printError(error);
      tempPluginUnload(false);
      return null;
    } finally {
      isLoading = false;
      (hangNotice as Notice | null)?.hide();
    }

    return tempPlugin;

    async function reportHang(): Promise<void> {
      await sleep(PLUGIN_HANG_TIMEOUT);
      if (isLoading) {
        hangNotice = new Notice(`Temp Plugin "${tempPluginClassName}" is taking long to load.`, 0);
      }
    }

    function tempPluginLoad(): void {
      new Notice(`Loaded Temp Plugin: ${tempPluginClassName}.`);
      if (params.cssText) {
        // eslint-disable-next-line obsidianmd/no-forbidden-elements, obsidianmd/prefer-active-doc -- Need dynamic `style` element. Need main document.
        styleEl = document.head.createEl('style', {
          attr: { id },
          text: params.cssText
        });
      }
    }

    function tempPluginUnload(shouldShowUnloadNotice: boolean): void {
      that.tempPlugins.delete(id);
      that.removeChild(unloadTempPluginCommandHandlerComponent);
      if (shouldShowUnloadNotice) {
        new Notice(`Unregistered Temp Plugin: ${tempPluginClassName}.`);
      }
      styleEl?.remove();
    }
  }

  public unloadTempPlugins(): void {
    for (const tempPlugin of this.tempPlugins.values()) {
      tempPlugin.unload();
    }
  }

  public unregisterTempPlugin(tempPluginClass: string | TempPluginClass): void {
    const tempPluginClassName = getTempPluginClassName(tempPluginClass);
    const id = makeTempPluginId(tempPluginClassName);
    const tempPlugin = this.tempPlugins.get(id);
    if (tempPlugin) {
      tempPlugin.unload();
    } else {
      new Notice(`Temp Plugin was not registered: ${tempPluginClassName}.`);
    }
  }
}

function getTempPluginClassName(tempPluginClass: string | TempPluginClass): string {
  return (typeof tempPluginClass === 'string' ? tempPluginClass : tempPluginClass.name) || DEFAULT_TEMP_PLUGIN_CLASS_NAME;
}

function makeTempPluginId(tempPluginClassName: string): string {
  return `__temp-plugin-${tempPluginClassName}`;
}
