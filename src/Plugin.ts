import type { PluginSettingsManagerBase } from 'obsidian-dev-utils/obsidian/Plugin/PluginSettingsManagerBase';

import { PluginSettingTab } from 'obsidian';
import {
  convertAsyncToSync,
  invokeAsyncSafely
} from 'obsidian-dev-utils/Async';
import { PluginBase } from 'obsidian-dev-utils/obsidian/Plugin/PluginBase';

import type { RequireHandler } from './RequireHandler.ts';
import type { ScriptFolderWatcher } from './ScriptFolderWatcher.ts';

import {
  registerCodeButtonBlock,
  unloadTempPlugins
} from './CodeButtonBlock.ts';
import { getPlatformDependencies } from './PlatformDependencies.ts';
import { PluginSettings } from './PluginSettings.ts';
import { PluginSettingsManager } from './PluginSettingsManager.ts';
import { CodeScriptToolkitPluginPluginSettingsTab } from './PluginSettingsTab.ts';
import {
  cleanupStartupScript,
  invokeStartupScript,
  registerInvocableScripts,
  reloadStartupScript,
  selectAndInvokeScript
} from './Script.ts';

export class Plugin extends PluginBase<PluginSettings> {
  private requireHandler!: RequireHandler;
  private scriptFolderWatcher!: ScriptFolderWatcher;

  public async applyNewSettings(): Promise<void> {
    await this.scriptFolderWatcher.register(this, () => registerInvocableScripts(this));
  }

  public override async onLoadSettings(settings: PluginSettings): Promise<void> {
    await super.onLoadSettings(settings);
    invokeAsyncSafely(async () => {
      await this.waitForLifecycleEvent('layoutReady');
      await this.applyNewSettings();
    });
  }

  public override async onSaveSettings(newSettings: PluginSettings, oldSettings: PluginSettings): Promise<void> {
    await super.onSaveSettings(newSettings, oldSettings);
    await this.applyNewSettings();
  }

  protected override createPluginSettingsTab(): null | PluginSettingTab {
    return new CodeScriptToolkitPluginPluginSettingsTab(this);
  }

  protected override createSettingsManager(): PluginSettingsManagerBase<PluginSettings> {
    return new PluginSettingsManager(this);
  }

  protected override async onLayoutReady(): Promise<void> {
    await invokeStartupScript(this);
    this.register(() => cleanupStartupScript(this));
  }

  protected override async onloadComplete(): Promise<void> {
    const platformDependencies = await getPlatformDependencies();
    this.scriptFolderWatcher = platformDependencies.scriptFolderWatcher;
    this.requireHandler = platformDependencies.requireHandler;
    this.requireHandler.register(this, require);

    registerCodeButtonBlock(this);
    this.addCommand({
      callback: () => selectAndInvokeScript(this),
      id: 'invokeScript',
      name: 'Invoke Script: <<Choose>>'
    });

    this.addCommand({
      callback: () => {
        this.requireHandler.clearCache();
      },
      id: 'clearCache',
      name: 'Clear Cache'
    });

    this.addCommand({
      callback: unloadTempPlugins,
      id: 'unload-temp-plugins',
      name: 'Unload Temp Plugins'
    });

    this.addCommand({
      callback: convertAsyncToSync(() => reloadStartupScript(this)),
      id: 'reload-startup-script',
      name: 'Reload Startup Script'
    });
  }
}
