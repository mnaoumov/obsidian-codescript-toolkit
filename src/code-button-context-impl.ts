import type {
  App,
  MarkdownPostProcessorContext,
  Plugin as ObsidianPlugin,
  TFile
} from 'obsidian';
import type { CodeBlockMarkdownInformation } from 'obsidian-dev-utils/obsidian/code-block-markdown-information';
import type { ResourceLockComponent } from 'obsidian-dev-utils/obsidian/resource-lock';

import { MarkdownRenderer } from 'obsidian';
import { ComponentEx } from 'obsidian-dev-utils/obsidian/components/component-ex';
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
  CodeButtonContextInsertAfterCodeButtonBlockParams,
  CodeButtonContextInsertBeforeCodeButtonBlockParams,
  CodeButtonContextReplaceCodeButtonBlockParams,
  // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
  RegisterTempPluginParams,
  // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
  TempPluginClass
} from './code-button-context.ts';

import { ConsoleWrapper } from './console-wrapper.ts';
// eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
import { TempPluginRegistryComponent } from './temp-plugin-registry.ts';

interface CodeButtonContextImplComponentConstructorParams {
  readonly app: App;
  readonly config: CodeButtonBlockConfig;
  readonly markdownInfo: CodeBlockMarkdownInformation | null;
  readonly markdownPostProcessorContext: MarkdownPostProcessorContext;
  readonly parentEl: HTMLElement;
  readonly resourceLockComponent: null | ResourceLockComponent;
  readonly resultEl: HTMLElement;
  readonly source: string;
  // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
  readonly tempPluginRegistry: TempPluginRegistryComponent;
}

// eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
type CodeButtonContextImplComponentRegisterTempPluginParams<TPlugin extends ObsidianPlugin = ObsidianPlugin> = RegisterTempPluginParams<TPlugin>;

export class CodeButtonContextImplComponent extends ComponentEx implements CodeButtonContext {
  public readonly app: App;
  public readonly config: CodeButtonBlockConfig;
  public readonly console: Console;
  public readonly container: HTMLElement;
  public readonly markdownInfo: CodeBlockMarkdownInformation | null;
  public readonly markdownPostProcessorContext: MarkdownPostProcessorContext;
  public readonly parentEl: HTMLElement;
  public readonly source: string;
  public readonly sourceFile: TFile;

  private readonly resourceLockComponent: null | ResourceLockComponent;
  // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
  private readonly tempPluginRegistry: TempPluginRegistryComponent;

  public constructor(params: CodeButtonContextImplComponentConstructorParams) {
    super();
    this.app = params.app;
    this.config = params.config;
    this.resourceLockComponent = params.resourceLockComponent;
    this.markdownInfo = params.markdownInfo;
    this.markdownPostProcessorContext = params.markdownPostProcessorContext;
    this.parentEl = params.parentEl;
    this.source = params.source;

    this.sourceFile = getFile({ app: this.app, pathOrFile: params.markdownPostProcessorContext.sourcePath });
    this.container = params.config.isRaw ? this.parentEl : params.resultEl;
    const wrappedConsole = new ConsoleWrapper({ resultEl: this.container });
    this.console = wrappedConsole.getConsoleInstance(this.config.shouldWrapConsole);
    // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
    this.tempPluginRegistry = params.tempPluginRegistry;
  }

  // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
  public getTempPlugin(tempPluginClass: string | TempPluginClass): null | ObsidianPlugin {
    return this.tempPluginRegistry.getTempPlugin(tempPluginClass);
  }

  // eslint-disable-next-line obsidian-dev-utils/params-options-name-match -- Implements the CodeButtonContext interface and must share its params type.
  public async insertAfterCodeButtonBlock(params: CodeButtonContextInsertAfterCodeButtonBlockParams): Promise<void> {
    const { lineOffset, markdown, shouldPreserveLinePrefix } = params;
    await insertAfterCodeBlock({
      app: this.app,
      context: this.markdownPostProcessorContext,
      el: this.parentEl,
      lineOffset: lineOffset ?? 0,
      resourceLockComponent: this.resourceLockComponent,
      shouldPreserveLinePrefix: shouldPreserveLinePrefix ?? true,
      source: this.source,
      text: markdown
    });
  }

  // eslint-disable-next-line obsidian-dev-utils/params-options-name-match -- Implements the CodeButtonContext interface and must share its params type.
  public async insertBeforeCodeButtonBlock(params: CodeButtonContextInsertBeforeCodeButtonBlockParams): Promise<void> {
    const { lineOffset, markdown, shouldPreserveLinePrefix } = params;
    await insertBeforeCodeBlock({
      app: this.app,
      context: this.markdownPostProcessorContext,
      el: this.parentEl,
      lineOffset: lineOffset ?? 0,
      resourceLockComponent: this.resourceLockComponent,
      shouldPreserveLinePrefix: shouldPreserveLinePrefix ?? true,
      source: this.source,
      text: markdown
    });
  }

  // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
  public async registerTempPlugin<TPlugin extends ObsidianPlugin = ObsidianPlugin>(
    params: CodeButtonContextImplComponentRegisterTempPluginParams<TPlugin>
  ): Promise<null | TPlugin> {
    return await this.tempPluginRegistry.registerTempPlugin<TPlugin>(params);
  }

  public async removeCodeButtonBlock(shouldKeepGap?: boolean): Promise<void> {
    await removeCodeBlock({
      app: this.app,
      context: this.markdownPostProcessorContext,
      el: this.parentEl,
      resourceLockComponent: this.resourceLockComponent,
      shouldKeepGap: shouldKeepGap ?? false,
      source: this.source
    });
  }

  public async renderMarkdown(markdown: string): Promise<void> {
    await MarkdownRenderer.render(this.app, markdown, this.container, this.sourceFile.path, this);
  }

  // eslint-disable-next-line obsidian-dev-utils/params-options-name-match -- Implements the CodeButtonContext interface and must share its params type.
  public async replaceCodeButtonBlock(params: CodeButtonContextReplaceCodeButtonBlockParams): Promise<void> {
    const { markdown, shouldKeepGapWhenEmpty, shouldPreserveLinePrefix } = params;
    await replaceCodeBlock({
      app: this.app,
      codeBlockProvider: markdown,
      context: this.markdownPostProcessorContext,
      el: this.parentEl,
      resourceLockComponent: this.resourceLockComponent,
      shouldKeepGapWhenEmpty: shouldKeepGapWhenEmpty ?? false,
      shouldPreserveLinePrefix: shouldPreserveLinePrefix ?? true,
      source: this.source
    });
  }
}
