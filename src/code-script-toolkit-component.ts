import type { App } from 'obsidian';
import type { ActiveFileProvider } from 'obsidian-dev-utils/obsidian/active-file-provider';
import type { CommandRegistrar } from 'obsidian-dev-utils/obsidian/command-registrar';
import type { MarkdownCodeBlockProcessorRegistrar } from 'obsidian-dev-utils/obsidian/markdown-code-block-processor-registrar';
import type { MenuEventRegistrar } from 'obsidian-dev-utils/obsidian/menu-event-registrar';
import type { ConsoleDebugComponent } from 'obsidian-dev-utils/obsidian/plugin/components/console-debug-component';
import type { LayoutReadyComponent } from 'obsidian-dev-utils/obsidian/plugin/components/layout-ready-component';

import { AsyncComponentBase } from 'obsidian-dev-utils/obsidian/components/async-component';

import type { PluginSettingsComponent } from './plugin-settings-component.ts';
import type { RequireHandlerFactory } from './require-handlers/require-handler-factory.ts';

import { registerCodeButtonBlock } from './code-button-block.ts';
import { registerCodeScriptBlock } from './code-script-block.ts';
import {
  cleanupStartupScript,
  invokeStartupScript
} from './script.ts';

interface CodeScriptToolkitComponentConstructorParams {
  readonly activeFileProvider: ActiveFileProvider;
  readonly app: App;
  readonly commandRegistrar: CommandRegistrar;
  readonly consoleDebugComponent: ConsoleDebugComponent;
  readonly markdownCodeBlockProcessorRegistrar: MarkdownCodeBlockProcessorRegistrar;
  readonly menuEventRegistrar: MenuEventRegistrar;
  readonly pluginName: string;
  readonly pluginSettingsComponent: PluginSettingsComponent;
  readonly requireHandlerFactory: RequireHandlerFactory;
}

export class CodeScriptToolkitComponent extends AsyncComponentBase implements LayoutReadyComponent {
  private readonly activeFileProvider: ActiveFileProvider;
  private readonly app: App;
  private readonly commandRegistrar: CommandRegistrar;
  private readonly consoleDebugComponent: ConsoleDebugComponent;
  private readonly markdownCodeBlockProcessorRegistrar: MarkdownCodeBlockProcessorRegistrar;
  private readonly menuEventRegistrar: MenuEventRegistrar;
  private readonly pluginName: string;

  private readonly pluginSettingsComponent: PluginSettingsComponent;
  private readonly requireHandlerFactory: RequireHandlerFactory;

  public constructor(params: CodeScriptToolkitComponentConstructorParams) {
    super();
    this.app = params.app;
    this.pluginSettingsComponent = params.pluginSettingsComponent;
    this.consoleDebugComponent = params.consoleDebugComponent;
    this.activeFileProvider = params.activeFileProvider;
    this.commandRegistrar = params.commandRegistrar;
    this.menuEventRegistrar = params.menuEventRegistrar;
    this.pluginName = params.pluginName;
    this.markdownCodeBlockProcessorRegistrar = params.markdownCodeBlockProcessorRegistrar;
    this.requireHandlerFactory = params.requireHandlerFactory;
  }

  public async onLayoutReady(): Promise<void> {
    await invokeStartupScript({
      activeFileProvider: this.activeFileProvider,
      app: this.app,
      commandRegistrar: this.commandRegistrar,
      consoleDebugComponent: this.consoleDebugComponent,
      menuEventRegistrar: this.menuEventRegistrar,
      pluginName: this.pluginName,
      pluginSettingsComponent: this.pluginSettingsComponent,
      requireHandlerFactory: this.requireHandlerFactory
    });
    this.register(() => cleanupStartupScript(this.app));
  }

  public override async onload(): Promise<void> {
    registerCodeButtonBlock({
      activeFileProvider: this.activeFileProvider,
      app: this.app,
      codeScriptToolkitComponent: this,
      commandRegistrar: this.commandRegistrar,
      consoleDebugComponent: this.consoleDebugComponent,
      markdownCodeBlockProcessorRegistrar: this.markdownCodeBlockProcessorRegistrar,
      menuEventRegistrar: this.menuEventRegistrar,
      pluginName: this.pluginName,
      pluginSettingsComponent: this.pluginSettingsComponent,
      requireHandlerFactory: this.requireHandlerFactory
    });
    await registerCodeScriptBlock(this);
  }
}
