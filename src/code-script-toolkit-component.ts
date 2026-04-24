import type {
  App,
  Command,
  MarkdownPostProcessor,
  MarkdownPostProcessorContext,
  ObsidianProtocolHandler,
  Plugin
} from 'obsidian';
import type { ConsoleDebugComponent } from 'obsidian-dev-utils/obsidian/plugin/components/console-debug-component';
import type { LayoutReadyComponent } from 'obsidian-dev-utils/obsidian/plugin/components/layout-ready-component';
import type { ReadonlyPluginSettings } from 'obsidian-dev-utils/obsidian/plugin/components/plugin-settings-component';
import type { MaybeReturn } from 'obsidian-dev-utils/type';

import { AsyncComponentBase } from 'obsidian-dev-utils/obsidian/components/async-component';
import { registerAsyncEvent } from 'obsidian-dev-utils/obsidian/components/async-events-component';

import type { CodeButtonBlockConfig } from './code-button-block-config.ts';
import type { PluginSettingsComponent } from './plugin-settings-component.ts';
import type { PluginSettings } from './plugin-settings.ts';
import type { RequireHandler } from './require-handler.ts';
import type { ScriptFolderWatcher } from './script-folder-watcher.ts';

import { registerCodeButtonBlock } from './code-button-block.ts';
import { registerCodeScriptBlock } from './code-script-block.ts';
import { getPlatformDependencies } from './platform-dependencies.ts';
import {
  cleanupStartupScript,
  invokeStartupScript,
  registerInvocableScripts
} from './script.ts';

export class CodeScriptToolkitComponent extends AsyncComponentBase implements LayoutReadyComponent {
  public get settings(): ReadonlyPluginSettings<PluginSettings> {
    return this.pluginSettingsComponent.settings;
  }

  private requireHandler?: RequireHandler;

  private scriptFolderWatcher?: ScriptFolderWatcher;

  public constructor(
    public readonly app: App,
    private readonly pluginSettingsComponent: PluginSettingsComponent,
    private readonly consoleDebugComponent: ConsoleDebugComponent,
    public readonly plugin: Plugin
  ) {
    super();
  }

  public addCommand(command: Command): Command {
    return this.plugin.addCommand(command);
  }

  public async applyNewSettings(): Promise<void> {
    await this.scriptFolderWatcher?.register(this, () => registerInvocableScripts(this));
  }

  public consoleDebug(message: string, ...args: unknown[]): void {
    this.consoleDebugComponent.debug(message, ...args);
  }

  public async onLayoutReady(): Promise<void> {
    await invokeStartupScript(this);
    this.register(() => cleanupStartupScript(this));

    registerAsyncEvent(this, this.pluginSettingsComponent.on('loadSettings', this.applyNewSettings.bind(this)));
    registerAsyncEvent(this, this.pluginSettingsComponent.on('saveSettings', this.applyNewSettings.bind(this)));
  }

  public override async onload(): Promise<void> {
    await super.onload();
    const platformDependencies = await getPlatformDependencies();
    this.scriptFolderWatcher = platformDependencies.scriptFolderWatcher;
    this.requireHandler = platformDependencies.requireHandler;
    this.requireHandler.register(this, require);

    registerCodeButtonBlock(this);
    await registerCodeScriptBlock(this);
  }

  public parseDefaultCodeButtonConfig(): null | Partial<CodeButtonBlockConfig> {
    return this.pluginSettingsComponent.parseDefaultCodeButtonConfig();
  }

  public registerMarkdownCodeBlockProcessor(
    language: string,
    handler: (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => MaybeReturn<Promise<unknown>>,
    sortOrder?: number
  ): MarkdownPostProcessor {
    return this.plugin.registerMarkdownCodeBlockProcessor(language, handler, sortOrder);
  }

  public registerObsidianProtocolHandler(action: string, handler: ObsidianProtocolHandler): void {
    this.plugin.registerObsidianProtocolHandler(action, handler);
  }

  public removeCommand(commandId: string): void {
    this.plugin.removeCommand(commandId);
  }
}
