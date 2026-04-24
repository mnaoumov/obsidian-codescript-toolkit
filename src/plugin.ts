import type { PluginSettingsWrapper } from 'obsidian-dev-utils/obsidian/plugin/plugin-settings-wrapper';

import { invokeAsyncSafely } from 'obsidian-dev-utils/async';
import { PluginBase } from 'obsidian-dev-utils/obsidian/plugin/plugin-base';

import type { PluginSettings } from './plugin-settings.ts';
import type { PluginTypes } from './plugin-types.ts';
import type { RequireHandler } from './require-handler.ts';
import type { ScriptFolderWatcher } from './script-folder-watcher.ts';

import { registerCodeButtonBlock } from './code-button-block.ts';
import { registerCodeScriptBlock } from './code-script-block.ts';
import { ClearCacheCommand } from './commands/clear-cache-command.ts';
import { InvokeScriptChooseCommand } from './commands/invoke-script-choose-command.ts';
import { ReloadStartupScriptCommand } from './commands/reload-startup-script-command.ts';
import { UnloadTempPluginsCommand } from './commands/unload-temp-plugins-command.ts';
import { getPlatformDependencies } from './platform-dependencies.ts';
import { PluginSettingsManager } from './plugin-settings-manager.ts';
import { PluginSettingsTab } from './plugin-settings-tab.ts';
import { ProtocolHandlerComponent } from './protocol-handler-component.ts';
import {
  cleanupStartupScript,
  invokeStartupScript,
  registerInvocableScripts
} from './script.ts';

export class Plugin extends PluginBase<PluginTypes> {
  private requireHandler?: RequireHandler;
  private scriptFolderWatcher?: ScriptFolderWatcher;

  public async applyNewSettings(): Promise<void> {
    await this.scriptFolderWatcher?.register(this, () => registerInvocableScripts(this));
  }

  public override async onLoadSettings(settings: PluginSettingsWrapper<PluginSettings>, isInitialLoad: boolean): Promise<void> {
    await super.onLoadSettings(settings, isInitialLoad);
    invokeAsyncSafely(async () => {
      await this.waitForLifecycleEvent('layoutReady');
      await this.applyNewSettings();
    });
  }

  public override async onSaveSettings(
    newSettings: PluginSettingsWrapper<PluginSettings>,
    oldSettings: PluginSettingsWrapper<PluginSettings>,
    context?: unknown
  ): Promise<void> {
    await super.onSaveSettings(newSettings, oldSettings, context);
    await this.applyNewSettings();
  }

  protected override createSettingsManager(): PluginSettingsManager {
    return new PluginSettingsManager(this);
  }

  protected override createSettingsTab(): null | PluginSettingsTab {
    return new PluginSettingsTab(this);
  }

  protected override async onLayoutReady(): Promise<void> {
    await invokeStartupScript(this);
    this.register(() => cleanupStartupScript(this));
  }

  protected override async onloadImpl(): Promise<void> {
    await super.onloadImpl();
    const platformDependencies = await getPlatformDependencies();
    this.scriptFolderWatcher = platformDependencies.scriptFolderWatcher;
    this.requireHandler = platformDependencies.requireHandler;
    await this.requireHandler.register(this, require);

    registerCodeButtonBlock(this);
    await registerCodeScriptBlock(this);

    new InvokeScriptChooseCommand(this).register();
    new ClearCacheCommand(this).register();
    new UnloadTempPluginsCommand(this).register();
    new ReloadStartupScriptCommand(this).register();
    this.addChild(new ProtocolHandlerComponent(this));
  }
}
