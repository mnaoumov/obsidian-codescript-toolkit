import type {
  App,
  MarkdownPostProcessorContext,
  TFile
} from 'obsidian';
import type { CodeBlockMarkdownInformation } from 'obsidian-dev-utils/obsidian/code-block-markdown-information';

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

import { ConsoleWrapper } from './console-wrapper.ts';
import { TempPluginRegistry } from './temp-plugin-registry.ts';

interface CodeButtonContextImplConstructorParams {
  readonly app: App;
  readonly config: CodeButtonBlockConfig;
  readonly markdownInfo: CodeBlockMarkdownInformation | null;
  readonly markdownPostProcessorContext: MarkdownPostProcessorContext;
  readonly parentEl: HTMLElement;
  readonly resultEl: HTMLElement;
  readonly source: string;
  readonly tempPluginRegistry: TempPluginRegistry;
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

  private readonly tempPluginRegistry: TempPluginRegistry;

  public constructor(params: CodeButtonContextImplConstructorParams) {
    super();
    this.app = params.app;
    this.config = params.config;
    this.markdownInfo = params.markdownInfo;
    this.markdownPostProcessorContext = params.markdownPostProcessorContext;
    this.parentEl = params.parentEl;
    this.source = params.source;

    this.sourceFile = getFile(this.app, params.markdownPostProcessorContext.sourcePath);
    this.container = params.config.isRaw ? this.parentEl : params.resultEl;
    const wrappedConsole = new ConsoleWrapper({ resultEl: this.container });
    this.console = wrappedConsole.getConsoleInstance(this.config.shouldWrapConsole);
    this.tempPluginRegistry = params.tempPluginRegistry;
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
    this.tempPluginRegistry.registerTempPlugin(params);
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
