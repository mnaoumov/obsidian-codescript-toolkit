import type { PluginSettingsWrapper } from 'obsidian-dev-utils/obsidian/Plugin/PluginSettingsWrapper';

import { invokeAsyncSafely } from 'obsidian-dev-utils/Async';
import { PluginBase } from 'obsidian-dev-utils/obsidian/Plugin/PluginBase';

import type { PluginSettings } from './PluginSettings.ts';
import type { PluginTypes } from './PluginTypes.ts';
import type { RequireHandler } from './RequireHandler.ts';
import type { ScriptFolderWatcher } from './ScriptFolderWatcher.ts';

import { registerCodeButtonBlock } from './CodeButtonBlock.ts';
import { registerCodeScriptBlock } from './CodeScriptBlock.ts';
import { ClearCacheCommand } from './Commands/ClearCacheCommand.ts';
import { InvokeScriptChooseCommand } from './Commands/InvokeScriptChooseCommand.ts';
import { ReloadStartupScriptCommand } from './Commands/ReloadStartupScriptCommand.ts';
import { UnloadTempPluginsCommand } from './Commands/UnloadTempPluginsCommand.ts';
import { getPlatformDependencies } from './PlatformDependencies.ts';
import { PluginSettingsManager } from './PluginSettingsManager.ts';
import { PluginSettingsTab } from './PluginSettingsTab.ts';
import { ProtocolHandlerComponent } from './ProtocolHandlerComponent.ts';
import {
  cleanupStartupScript,
  invokeStartupScript,
  registerInvocableScripts
} from './Script.ts';

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
