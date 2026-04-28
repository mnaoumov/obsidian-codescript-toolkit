import type { MarkdownPostProcessor } from 'obsidian';
import type { MarkdownPostProcessorContext } from 'obsidian';
import type { MaybeReturn } from 'obsidian-dev-utils/type';
import type { Plugin } from 'obsidian';

export interface MarkdownCodeBlockProcessorRegistrar {
  registerMarkdownCodeBlockProcessor(
    language: string,
    handler: (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => MaybeReturn<Promise<unknown>>,
    sortOrder?: number
  ): MarkdownPostProcessor;
}

export class PluginMarkdownCodeBlockProcessorRegistrar implements MarkdownCodeBlockProcessorRegistrar {
  private readonly plugin: Plugin;
  public constructor(plugin: Plugin) {
    this.plugin = plugin;
  }

  public registerMarkdownCodeBlockProcessor(
    language: string,
    handler: (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => MaybeReturn<Promise<unknown>>,
    sortOrder?: number
  ): MarkdownPostProcessor {
    return this.plugin.registerMarkdownCodeBlockProcessor(language, handler, sortOrder);
  }
}
