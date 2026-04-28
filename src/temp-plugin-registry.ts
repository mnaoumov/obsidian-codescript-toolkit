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

import type { TempPluginClass } from './code-button-context.ts';

import { UnloadTempPluginCommandHandler } from './command-handlers/unload-temp-plugin-command-handler.ts';

const tempPlugins = new Map<string, ObsidianPlugin>();

interface RegisterTempPluginParams {
  readonly cssText?: string;
  readonly tempPluginClass: TempPluginClass;
}

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

  public constructor(params: TempPluginRegistryConstructorParams) {
    super();
    this.app = params.app;
    this.pluginName = params.pluginName;
    this.commandRegistrar = params.commandRegistrar;
    this.menuEventRegistrar = params.menuEventRegistrar;
    this.activeFileProvider = params.activeFileProvider;
  }

  public registerTempPlugin(params: RegisterTempPluginParams): void {
    const tempPluginClassName = params.tempPluginClass.name || '_AnonymousPlugin';
    const id = makeTempPluginId(tempPluginClassName);

    const existingPlugin = tempPlugins.get(id);
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

    tempPlugins.set(id, tempPlugin);

    type LoadFn = () => Promise<void>;

    const loadFn = tempPlugin.load.bind(tempPlugin) as LoadFn;

    invokeAsyncSafely(async () => {
      let isLoaded = false;
      try {
        await loadFn();
        isLoaded = true;
      } catch (error) {
        new Notice(`Failed to load Temp Plugin: ${tempPluginClassName}. See console for details.`);
        printError(error);
      }

      if (!isLoaded) {
        return;
      }

      let styleEl: HTMLStyleElement | null = null;
      new Notice(`Loaded Temp Plugin: ${tempPluginClassName}.`);
      if (params.cssText) {
        // eslint-disable-next-line obsidianmd/no-forbidden-elements, obsidianmd/prefer-active-doc -- Need dynamic `style` element. Need main document.
        styleEl = document.head.createEl('style', {
          attr: { id },
          text: params.cssText
        });
      }

      const unloadTempPluginCommandHandler = new UnloadTempPluginCommandHandler({
        pluginName: this.pluginName,
        tempPlugin,
        tempPluginClassName
      });
      const unloadTempPluginCommandHandlerComponent = this.addChild(
        new CommandHandlerComponent({
          activeFileProvider: this.activeFileProvider,
          commandHandlers: [unloadTempPluginCommandHandler],
          commandRegistrar: this.commandRegistrar,
          menuEventRegistrar: this.menuEventRegistrar
        })
      );

      const originalUnload = tempPlugin.unload.bind(tempPlugin);
      tempPlugin.unload = (): void => {
        try {
          originalUnload();
        } catch (error) {
          new Notice(`Failed to unload Temp Plugin: ${tempPluginClassName}. See console for details.`);
          printError(error);
        }
        tempPlugins.delete(id);
        this.removeChild(unloadTempPluginCommandHandlerComponent);
        new Notice(`Unregistered Temp Plugin: ${tempPluginClassName}.`);
        styleEl?.remove();
      };
    });
  }
}

export function unloadTempPlugins(): void {
  for (const tempPlugin of tempPlugins.values()) {
    tempPlugin.unload();
  }
}

export function unregisterTempPlugin(tempPluginClassName: string): void {
  const id = makeTempPluginId(tempPluginClassName);
  const tempPlugin = tempPlugins.get(id);
  if (tempPlugin) {
    tempPlugin.unload();
  } else {
    new Notice(`Temp Plugin was not registered: ${tempPluginClassName}.`);
  }
}

function makeTempPluginId(tempPluginClassName: string): string {
  return `__temp-plugin-${tempPluginClassName}`;
}
