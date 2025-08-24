import type {
  App,
  MarkdownPostProcessorContext,
  TFile
} from 'obsidian';
import type { CodeBlockMarkdownInformation } from 'obsidian-dev-utils/obsidian/CodeBlockMarkdownInformation';

import { MarkdownRenderer } from 'obsidian';
import { getFile } from 'obsidian-dev-utils/obsidian/FileSystem';
import {
  insertAfterCodeBlock,
  insertBeforeCodeBlock,
  removeCodeBlock,
  replaceCodeBlock
} from 'obsidian-dev-utils/obsidian/MarkdownCodeBlockProcessor';

import type { CodeButtonBlockConfig } from './CodeButtonBlockConfig.ts';
import type {
  CodeButtonContext,
  TempPluginClass
} from './CodeButtonContext.ts';
import type { Plugin } from './Plugin.ts';

import { ConsoleWrapper } from './ConsoleWrapper.ts';
import { registerTempPlugin } from './TempPluginRegistry.ts';

interface CodeButtonContextImplConstructorOptions {
  plugin: Plugin;
  config: CodeButtonBlockConfig;
  markdownPostProcessorContext: MarkdownPostProcessorContext;
  parentEl: HTMLElement;
  markdownInfo: CodeBlockMarkdownInformation;
  resultEl: HTMLElement;
  source: string;
}

export class CodeButtonContextImpl implements CodeButtonContext {
  private readonly plugin: Plugin;
  private readonly resultEl: HTMLElement;

  public readonly app: App;
  public readonly config: CodeButtonBlockConfig;
  public readonly console: Console;
  public readonly container: HTMLElement;
  public readonly markdownInfo: CodeBlockMarkdownInformation;
  public readonly markdownPostProcessorContext: MarkdownPostProcessorContext;
  public readonly parentEl: HTMLElement;
  public readonly source: string;
  public readonly sourceFile: TFile;

  public constructor(options: CodeButtonContextImplConstructorOptions) {
    this.app = options.plugin.app;
    this.config = options.config;
    this.markdownInfo = options.markdownInfo;
    this.markdownPostProcessorContext = options.markdownPostProcessorContext;
    this.parentEl = options.parentEl;
    this.plugin = options.plugin;
    this.resultEl = options.resultEl;
    this.source = options.source;

    this.sourceFile = getFile(this.app, options.markdownPostProcessorContext.sourcePath);
    this.container = this.config.isRaw ? this.parentEl : this.resultEl;
    const wrappedConsole = new ConsoleWrapper(this.container);
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

  public registerTempPlugin(tempPluginClass: TempPluginClass): void {
    registerTempPlugin(tempPluginClass, this.plugin);
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
    await MarkdownRenderer.render(this.app, markdown, this.container, this.sourceFile.path, this.plugin);
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
