import type {
  App,
  MarkdownPostProcessorContext,
  TFile
} from 'obsidian';
import type { ActiveFileProvider } from 'obsidian-dev-utils/obsidian/active-file-provider';
import type { CodeBlockMarkdownInformation } from 'obsidian-dev-utils/obsidian/code-block-markdown-information';
import type { CommandRegistrar } from 'obsidian-dev-utils/obsidian/command-registrar';
import type { MenuEventRegistrar } from 'obsidian-dev-utils/obsidian/menu-event-registrar';

import {
  Component,
  MarkdownRenderer
} from 'obsidian';
import { getFile } from 'obsidian-dev-utils/obsidian/file-system';
import {
  insertAfterCodeBlock,
  insertBeforeCodeBlock,
  removeCodeBlock,
  replaceCodeBlock
} from 'obsidian-dev-utils/obsidian/markdown-code-block-processor';

import type { CodeButtonBlockConfig } from './code-button-block-config.ts';
import type {
  CodeButtonContext,
  RegisterTempPluginParams
} from './code-button-context.ts';
import type { CodeScriptToolkitComponent } from './code-script-toolkit-component.ts';

import { ConsoleWrapper } from './console-wrapper.ts';
import { registerTempPlugin } from './temp-plugin-registry.ts';

interface CodeButtonContextImplConstructorParams {
  activeFileProvider: ActiveFileProvider;
  app: App;
  codeScriptToolkitComponent: CodeScriptToolkitComponent;
  commandRegistrar: CommandRegistrar;
  config: CodeButtonBlockConfig;
  markdownInfo: CodeBlockMarkdownInformation | null;
  markdownPostProcessorContext: MarkdownPostProcessorContext;
  menuEventRegistrar: MenuEventRegistrar;
  parentEl: HTMLElement;
  resultEl: HTMLElement;
  source: string;
}

export class CodeButtonContextImpl extends Component implements CodeButtonContext {
  public readonly app: App;
  public readonly config: CodeButtonBlockConfig;
  public readonly console: Console;
  public readonly container: HTMLElement;
  public readonly markdownInfo: CodeBlockMarkdownInformation | null;
  public readonly markdownPostProcessorContext: MarkdownPostProcessorContext;
  public readonly parentEl: HTMLElement;
  public readonly source: string;
  public readonly sourceFile: TFile;

  private readonly activeFileProvider: ActiveFileProvider;
  private readonly codeScriptToolkitComponent: CodeScriptToolkitComponent;
  private readonly commandRegistrar: CommandRegistrar;
  private readonly menuEventRegistrar: MenuEventRegistrar;
  private readonly resultEl: HTMLElement;

  public constructor(params: CodeButtonContextImplConstructorParams) {
    super();
    this.app = params.app;
    this.config = params.config;
    this.markdownInfo = params.markdownInfo;
    this.markdownPostProcessorContext = params.markdownPostProcessorContext;
    this.parentEl = params.parentEl;
    this.codeScriptToolkitComponent = params.codeScriptToolkitComponent;
    this.resultEl = params.resultEl;
    this.source = params.source;
    this.activeFileProvider = params.activeFileProvider;
    this.commandRegistrar = params.commandRegistrar;
    this.menuEventRegistrar = params.menuEventRegistrar;

    this.sourceFile = getFile(this.app, params.markdownPostProcessorContext.sourcePath);
    this.container = this.config.isRaw ? this.parentEl : this.resultEl;
    const wrappedConsole = new ConsoleWrapper({ resultEl: this.container });
    this.console = wrappedConsole.getConsoleInstance(this.config.shouldWrapConsole);
  }

  public async insertAfterCodeButtonBlock(markdown: string, lineOffset?: number, shouldPreserveLinePrefix?: boolean): Promise<void> {
    await insertAfterCodeBlock({
      app: this.app,
      ctx: this.markdownPostProcessorContext,
      el: this.parentEl,
      lineOffset: lineOffset ?? 0,
      shouldPreserveLinePrefix: shouldPreserveLinePrefix ?? true,
      source: this.source,
      text: markdown
    });
  }

  public async insertBeforeCodeButtonBlock(markdown: string, lineOffset?: number, shouldPreserveLinePrefix?: boolean): Promise<void> {
    await insertBeforeCodeBlock({
      app: this.app,
      ctx: this.markdownPostProcessorContext,
      el: this.parentEl,
      lineOffset: lineOffset ?? 0,
      shouldPreserveLinePrefix: shouldPreserveLinePrefix ?? true,
      source: this.source,
      text: markdown
    });
  }

  public registerTempPlugin(params: RegisterTempPluginParams): void {
    registerTempPlugin({
      activeFileProvider: this.activeFileProvider,
      app: this.app,
      codeScriptToolkitComponent: this.codeScriptToolkitComponent,
      commandRegistrar: this.commandRegistrar,
      cssText: params.cssText ?? '',
      menuEventRegistrar: this.menuEventRegistrar,
      tempPluginClass: params.tempPluginClass
    });
  }

  public async removeCodeButtonBlock(shouldKeepGap?: boolean): Promise<void> {
    await removeCodeBlock({
      app: this.app,
      ctx: this.markdownPostProcessorContext,
      el: this.parentEl,
      shouldKeepGap: shouldKeepGap ?? false,
      source: this.source
    });
  }

  public async renderMarkdown(markdown: string): Promise<void> {
    await MarkdownRenderer.render(this.app, markdown, this.container, this.sourceFile.path, this);
  }

  public async replaceCodeButtonBlock(markdown: string, shouldPreserveLinePrefix?: boolean, shouldKeepGapWhenEmpty?: boolean): Promise<void> {
    await replaceCodeBlock({
      app: this.app,
      codeBlockProvider: markdown,
      ctx: this.markdownPostProcessorContext,
      el: this.parentEl,
      shouldKeepGapWhenEmpty: shouldKeepGapWhenEmpty ?? false,
      shouldPreserveLinePrefix: shouldPreserveLinePrefix ?? true,
      source: this.source
    });
  }
}
