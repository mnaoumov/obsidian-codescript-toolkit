import type {
  App,
  MarkdownPostProcessorContext,
  Plugin as ObsidianPlugin,
  PluginManifest,
  TFile
} from 'obsidian';
import type { CodeBlockMarkdownInformation } from 'obsidian-dev-utils/obsidian/code-block-markdown-information';

import type { CodeButtonBlockConfig } from './code-button-block-config.ts';

/**
 * A context for the code button block.
 */
export interface CodeButtonContext {
  /**
   * Obsidian app instance.
   */
  app: App;

  /**
   * A config for the code button block.
   */
  config: CodeButtonBlockConfig;

  /**
   * A console instance.
   *
   * If {@link CodeButtonBlockConfig.shouldWrapConsole} is `true`, this will be a wrapper around the standard {@link console}.
   *
   * If {@link CodeButtonBlockConfig.shouldWrapConsole} is `false`, this will be the standard {@link console} itself.
   *
   * @see {@link https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/docs/code-button-config.md#shouldwrapconsole---console-messages}
   */
  console: Console;

  /**
   * A container element to render the output to.
   *
   * If {@link CodeButtonBlockConfig.isRaw} is `true`, this will be the same as {@link parentEl}.
   *
   * If {@link CodeButtonBlockConfig.isRaw} is `false`, this will be a child of {@link parentEl}.
   *
   * @see {@link https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/docs/code-button-context.md#codebuttoncontextcontainer}
   */
  container: HTMLElement;

  /**
   * Get a temp plugin by class name or class itself.
   *
   * @param tempPluginClass - The class name or class itself of the temp plugin.
   * @returns The temp plugin.
   */
  getTempPlugin(tempPluginClass: string | TempPluginClass): null | ObsidianPlugin;

  /**
   * Insert markdown after the code button block.
   *
   * @param params - The parameters to insert the markdown.
   *
   * @see {@link https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/docs/code-button-context.md#functions-to-modify-containing-note-file}
   */
  insertAfterCodeButtonBlock(params: CodeButtonContextInsertAfterCodeButtonBlockParams): Promise<void>;

  /**
   * Insert markdown before the code button block.
   *
   * @param params - The parameters to insert the markdown.
   *
   * @see {@link https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/docs/code-button-context.md#functions-to-modify-containing-note-file}
   */
  insertBeforeCodeButtonBlock(params: CodeButtonContextInsertBeforeCodeButtonBlockParams): Promise<void>;

  /**
   * Information about a code block in a markdown file
   *
   * @see {@link https://github.com/mnaoumov/obsidian-dev-utils/blob/main/src/obsidian/CodeBlockMarkdownInformation.ts}
   */
  markdownInfo: CodeBlockMarkdownInformation | null;

  /**
   * A markdown post processor context.
   */
  markdownPostProcessorContext: MarkdownPostProcessorContext;

  /**
   * A parent element where the code button block is rendered.
   */
  parentEl: HTMLElement;

  /**
   * Register a temp plugin.
   *
   * @param tempPluginClass - The class for the temp plugin.
   *
   * @see {@link https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/docs/code-button-context.md#codebuttoncontextregistertempplugin}
   */
  registerTempPlugin<TPlugin extends ObsidianPlugin = ObsidianPlugin>(params: RegisterTempPluginParams<TPlugin>): Promise<null | TPlugin>;

  /**
   * Remove the code button block.
   *
   * @param shouldKeepGap - Whether to keep the gap after removing the code button block. Defaults to `false`.
   *
   * @see {@link https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/docs/code-button-context.md#functions-to-modify-containing-note-file}
   */
  removeCodeButtonBlock(shouldKeepGap?: boolean): Promise<void>;

  /**
   * Render markdown inside the {@link container}.
   *
   * @param markdown - The markdown to render.
   *
   * @see {@link https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/docs/code-button-context.md#codebuttoncontextrendermarkdown}
   */
  renderMarkdown(markdown: string): Promise<void>;

  /**
   * Replace the code button block with the given markdown.
   *
   * @param params - The parameters to replace the code button block.
   *
   * @see {@link https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/docs/code-button-context.md#functions-to-modify-containing-note-file}
   */
  replaceCodeButtonBlock(params: CodeButtonContextReplaceCodeButtonBlockParams): Promise<void>;

  /**
   * The source code of the code button block.
   */
  source: string;

  /**
   * The source markdown file which contains the code button block.
   */
  sourceFile: TFile;
}

/**
 * Parameters to insert markdown after the code button block.
 */
export interface CodeButtonContextInsertAfterCodeButtonBlockParams {
  /**
   * The line offset to insert the markdown at. Defaults to 0.
   */
  readonly lineOffset?: number;

  /**
   * The markdown to insert.
   */
  readonly markdown: string;

  /**
   * Whether to preserve the line prefix. Defaults to `true`.
   */
  readonly shouldPreserveLinePrefix?: boolean;
}

/**
 * Parameters to insert markdown before the code button block.
 */
export interface CodeButtonContextInsertBeforeCodeButtonBlockParams {
  /**
   * The line offset to insert the markdown at. Defaults to 0.
   */
  readonly lineOffset?: number;

  /**
   * The markdown to insert.
   */
  readonly markdown: string;

  /**
   * Whether to preserve the line prefix. Defaults to `true`.
   */
  readonly shouldPreserveLinePrefix?: boolean;
}

/**
 * Parameters to replace the code button block with the given markdown.
 */
export interface CodeButtonContextReplaceCodeButtonBlockParams {
  /**
   * The markdown to replace the code button block with.
   */
  readonly markdown: string;

  /**
   * Whether to keep the gap when the new code block is empty. Defaults to `false`.
   */
  readonly shouldKeepGapWhenEmpty?: boolean;

  /**
   * Whether to preserve the line prefix. Defaults to `true`.
   */
  readonly shouldPreserveLinePrefix?: boolean;
}

export interface RegisterTempPluginParams<TPlugin extends ObsidianPlugin = ObsidianPlugin> {
  readonly cssText?: string;
  readonly tempPluginClass: TempPluginClass<TPlugin>;
}

/**
 * A temp plugin class signature.
 */
export type TempPluginClass<TPlugin extends ObsidianPlugin = ObsidianPlugin> = new (app: App, manifest: PluginManifest) => TPlugin;
