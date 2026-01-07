import type { PluginSettingsWrapper } from 'obsidian-dev-utils/obsidian/Plugin/PluginSettingsWrapper';

import {
  convertAsyncToSync,
  invokeAsyncSafely
} from 'obsidian-dev-utils/Async';
import { PluginBase } from 'obsidian-dev-utils/obsidian/Plugin/PluginBase';

import type { PluginSettings } from './PluginSettings.ts';
import type { PluginTypes } from './PluginTypes.ts';
import type { RequireHandler } from './RequireHandler.ts';
import type { ScriptFolderWatcher } from './ScriptFolderWatcher.ts';

import {
  insertSampleCodeButton,
  registerCodeButtonBlock
} from './CodeButtonBlock.ts';
import { registerCodeScriptBlock } from './CodeScriptBlock.ts';
import { getPlatformDependencies } from './PlatformDependencies.ts';
import { PluginSettingsManager } from './PluginSettingsManager.ts';
import { PluginSettingsTab } from './PluginSettingsTab.ts';
import { ProtocolHandlerComponent } from './ProtocolHandlerComponent.ts';
import {
  cleanupStartupScript,
  invokeStartupScript,
  registerInvocableScripts,
  reloadStartupScript,
  selectAndInvokeScript
} from './Script.ts';
import { unloadTempPlugins } from './TempPluginRegistry.ts';

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
    this.addCommand({
      callback: () => selectAndInvokeScript(this),
      id: 'invokeScript',
      name: 'Invoke script: <<Choose>>'
    });

    this.addCommand({
      callback: () => {
        this.requireHandler?.clearCache();
      },
      id: 'clearCache',
      name: 'Clear cache'
    });

    this.addCommand({
      callback: unloadTempPlugins,
      id: 'unload-temp-plugins',
      name: 'Unload temp plugins'
    });

    this.addCommand({
      callback: convertAsyncToSync(() => reloadStartupScript(this)),
      id: 'reload-startup-script',
      name: 'Reload startup script'
    });

    this.addCommand({
      editorCallback: insertSampleCodeButton,
      id: 'insert-sample-code-button',
      name: 'Insert sample code button'
    });

    this.addChild(new ProtocolHandlerComponent(this));
  }
}
