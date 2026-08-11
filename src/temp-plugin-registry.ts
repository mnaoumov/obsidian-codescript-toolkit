// eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
import type {
  App,
  Plugin as ObsidianPlugin
} from 'obsidian';
import type { CommandHandlerComponent } from 'obsidian-dev-utils/obsidian/command-handlers/command-handler-component';
import type { PluginNoticeComponent } from 'obsidian-dev-utils/obsidian/components/plugin-notice-component';

import { Notice } from 'obsidian';
import { invokeAsyncSafely } from 'obsidian-dev-utils/async';
import { printError } from 'obsidian-dev-utils/error';
import { ComponentEx } from 'obsidian-dev-utils/obsidian/components/component-ex';
import { ValueWrapper } from 'obsidian-dev-utils/value-wrapper';

import type {
  RegisterTempPluginParams as RegisterTemporaryPluginParams,
  // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
  TempPluginClass
} from './code-button-context.ts';
import type { PluginSettingsComponent } from './plugin-settings-component.ts';

import { UnloadTempPluginCommandHandler as UnloadTemporaryPluginCommandHandler } from './command-handlers/unload-temp-plugin-command-handler.ts';

type LoadFunction = () => Promise<void>;

const DEFAULT_TEMP_PLUGIN_CLASS_NAME = '_AnonymousPlugin';

// eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
interface TempPluginRegistryComponentConstructorParams {
  readonly app: App;
  readonly commandHandlerComponent: CommandHandlerComponent;
  readonly pluginNoticeComponent: PluginNoticeComponent;
  readonly pluginSettingsComponent: PluginSettingsComponent;
}

// eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
type TempPluginRegistryComponentRegisterTempPluginParams<TPlugin extends ObsidianPlugin = ObsidianPlugin> = RegisterTemporaryPluginParams<TPlugin>;

// eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
export class TempPluginRegistryComponent extends ComponentEx {
  private readonly app: App;
  private readonly commandHandlerComponent: CommandHandlerComponent;
  private readonly pluginNoticeComponent: PluginNoticeComponent;
  private readonly pluginSettingsComponent: PluginSettingsComponent;
  // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
  private readonly tempPlugins = new Map<string, ObsidianPlugin>();

  public constructor(params: TempPluginRegistryComponentConstructorParams) {
    super();
    this.app = params.app;
    this.commandHandlerComponent = params.commandHandlerComponent;
    this.pluginNoticeComponent = params.pluginNoticeComponent;
    this.pluginSettingsComponent = params.pluginSettingsComponent;
  }

  // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
  public getTempPlugin(tempPluginClass: string | TempPluginClass): null | ObsidianPlugin {
    // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
    const tempPluginClassName = getTempPluginClassName(tempPluginClass);
    const id = makeTemporaryPluginId(tempPluginClassName);
    return this.tempPlugins.get(id) ?? null;
  }

  // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
  public async registerTempPlugin<TPlugin extends ObsidianPlugin = ObsidianPlugin>(
    params: TempPluginRegistryComponentRegisterTempPluginParams<TPlugin>
  ): Promise<null | TPlugin> {
    const pluginNoticeComponent = this.pluginNoticeComponent;
    const pluginSettingsComponent = this.pluginSettingsComponent;
    // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
    const tempPlugins = this.tempPlugins;

    // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
    const tempPluginClassName = getTempPluginClassName(params.tempPluginClass);
    const id = makeTemporaryPluginId(tempPluginClassName);

    const existingPlugin = this.tempPlugins.get(id);
    if (existingPlugin) {
      existingPlugin.unload();
    }

    // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
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
    // A fresh instance per call, because `CommandHandlerComponent` invokes the factory once per menu
    // Surface and registering one instance twice throws.
    const unloadTemporaryPluginCommandHandlerDisposable = await this.commandHandlerComponent.registerCommandHandlers(() => [
      new UnloadTemporaryPluginCommandHandler({
        tempPlugin,

        tempPluginClassName
      })
    ]);

    const originalUnload = tempPlugin.unload.bind(tempPlugin);
    tempPlugin.unload = (): void => {
      tempPluginUnload(true);
      try {
        originalUnload();
      } catch (error) {
        this.pluginNoticeComponent.showNotice(`Failed to unload Temp Plugin: ${tempPluginClassName}. See console for details.`);
        printError(error);
      }
    };

    const loadFunction = tempPlugin.load.bind(tempPlugin) as LoadFunction;
    const PLUGIN_HANG_TIMEOUT = 3000;
    const hangNotice = ValueWrapper.of<Notice | null>(null);

    let isLoading = true;
    invokeAsyncSafely(reportHang);

    try {
      await loadFunction();
      tempPluginLoad();
    } catch (error) {
      this.pluginNoticeComponent.showNotice(`Failed to load Temp Plugin: ${tempPluginClassName}. See console for details.`);
      printError(error);
      tempPluginUnload(false);
      return null;
    } finally {
      isLoading = false;
      hangNotice.value?.hide();
    }

    return tempPlugin;

    async function reportHang(): Promise<void> {
      await sleep(PLUGIN_HANG_TIMEOUT);
      if (isLoading) {
        hangNotice.value = pluginNoticeComponent.showNotice(`Temp Plugin "${tempPluginClassName}" is taking long to load.`, {
          isPermanent: true
        });
      }
    }

    // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
    function tempPluginLoad(): void {
      if (pluginSettingsComponent.settings.shouldShowTempPluginLoadUnloadNotices) {
        pluginNoticeComponent.showNotice(`Loaded Temp Plugin: ${tempPluginClassName}.`);
      }
      if (params.cssText) {
        const STYLE_TAG_NAME = 'style';
        styleEl = document.head.createEl(STYLE_TAG_NAME, {
          attr: { id },
          text: params.cssText
        });
      }
    }

    // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
    function tempPluginUnload(shouldShowUnloadNotice: boolean): void {
      tempPlugins.delete(id);
      unloadTemporaryPluginCommandHandlerDisposable[Symbol.dispose]();
      if (shouldShowUnloadNotice && pluginSettingsComponent.settings.shouldShowTempPluginLoadUnloadNotices) {
        pluginNoticeComponent.showNotice(`Unregistered Temp Plugin: ${tempPluginClassName}.`);
      }
      styleEl?.remove();
    }
  }

  // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
  public unloadTempPlugins(): void {
    // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
    for (const tempPlugin of this.tempPlugins.values()) {
      tempPlugin.unload();
    }
  }

  // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
  public unregisterTempPlugin(tempPluginClass: string | TempPluginClass): void {
    // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
    const tempPluginClassName = getTempPluginClassName(tempPluginClass);
    const id = makeTemporaryPluginId(tempPluginClassName);
    // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
    const tempPlugin = this.tempPlugins.get(id);
    if (tempPlugin) {
      tempPlugin.unload();
    } else {
      this.pluginNoticeComponent.showNotice(`Temp Plugin was not registered: ${tempPluginClassName}.`);
    }
  }
}

// eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
function getTempPluginClassName(tempPluginClass: string | TempPluginClass): string {
  return (typeof tempPluginClass === 'string' ? tempPluginClass : tempPluginClass.name) || DEFAULT_TEMP_PLUGIN_CLASS_NAME;
}

// eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
function makeTemporaryPluginId(tempPluginClassName: string): string {
  return `__temp-plugin-${tempPluginClassName}`;
}
