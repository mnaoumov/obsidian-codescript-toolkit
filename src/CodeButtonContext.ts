import type {
  App,
  MarkdownPostProcessorContext,
  Plugin,
  PluginManifest,
  TFile
} from 'obsidian';
import type { CodeBlockMarkdownInformation } from 'obsidian-dev-utils/obsidian/CodeBlockMarkdownInformation';

import type { CodeButtonBlockConfig } from './CodeButtonBlockConfig.ts';

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
   * @see {@link https://github.com/mnaoumov/obsidian-codescript-toolkit?tab=readme-ov-file#console-messages}
   */
  console: Console;

  /**
   * A container element to render the output to.
   *
   * If {@link CodeButtonBlockConfig.isRaw} is `true`, this will be the same as {@link parentEl}.
   *
   * If {@link CodeButtonBlockConfig.isRaw} is `false`, this will be a child of {@link parentEl}.
   *
   * @see {@link https://github.com/mnaoumov/obsidian-codescript-toolkit?tab=readme-ov-file#container}
   */
  container: HTMLElement;

  /**
   * Insert markdown after the code button block.
   *
   * @param markdown - The markdown to insert.
   * @param lineOffset - The line offset to insert the markdown at. Defaults to 0.
   * @param shouldPreserveLinePrefix - Whether to preserve the line prefix. Defaults to `true`.
   *
   * @see {@link https://github.com/mnaoumov/obsidian-codescript-toolkit?tab=readme-ov-file#modify-containing-note-file}
   */
  insertAfterCodeButtonBlock(markdown: string, lineOffset?: number, shouldPreserveLinePrefix?: boolean): Promise<void>;

  /**
   * Insert markdown before the code button block.
   *
   * @param markdown - The markdown to insert.
   * @param lineOffset - The line offset to insert the markdown at. Defaults to 0.
   * @param shouldPreserveLinePrefix - Whether to preserve the line prefix. Defaults to `true`.
   *
   * @see {@link https://github.com/mnaoumov/obsidian-codescript-toolkit?tab=readme-ov-file#modify-containing-note-file}
   */
  insertBeforeCodeButtonBlock(markdown: string, lineOffset?: number, shouldPreserveLinePrefix?: boolean): Promise<void>;

  /**
   * Information about a code block in a markdown file
   *
   * @see {@link https://github.com/mnaoumov/obsidian-dev-utils/blob/main/src/obsidian/CodeBlockMarkdownInformation.ts}
   */
  markdownInfo: CodeBlockMarkdownInformation;

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
   * @see {@link https://github.com/mnaoumov/obsidian-codescript-toolkit?tab=readme-ov-file#temp-plugins}
   */
  registerTempPlugin(tempPluginClass: TempPluginClass): void;

  /**
   * Remove the code button block.
   *
   * @param shouldKeepGap - Whether to keep the gap after removing the code button block. Defaults to `false`.
   *
   * @see {@link https://github.com/mnaoumov/obsidian-codescript-toolkit?tab=readme-ov-file#modify-containing-note-file}
   */
  removeCodeButtonBlock(shouldKeepGap?: boolean): Promise<void>;

  /**
   * Render markdown inside the {@link container}.
   *
   * @param markdown - The markdown to render.
   *
   * @see {@link https://github.com/mnaoumov/obsidian-codescript-toolkit?tab=readme-ov-file#render-markdown}
   */
  renderMarkdown(markdown: string): Promise<void>;

  /**
   * Replace the code button block with the given markdown.
   *
   * @param markdown - The markdown to replace the code button block with.
   * @param shouldPreserveLinePrefix - Whether to preserve the line prefix. Defaults to `true`.
   * @param shouldKeepGapWhenEmpty - Whether to keep the gap when the new code block is empty. Defaults to `false`.
   *
   * @see {@link https://github.com/mnaoumov/obsidian-codescript-toolkit?tab=readme-ov-file#modify-containing-note-file}
   */
  replaceCodeButtonBlock(markdown: string, shouldPreserveLinePrefix?: boolean, shouldKeepGapWhenEmpty?: boolean): Promise<void>;

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
 * A temp plugin class signature.
 */
export type TempPluginClass = new (app: App, manifest: PluginManifest) => Plugin;
