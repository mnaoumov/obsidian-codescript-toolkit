import type { ObsidianProtocolHandler } from 'obsidian';
import type { Plugin } from 'obsidian';

export interface ObsidianProtocolHandlerRegistrar {
  registerObsidianProtocolHandler(action: string, handler: ObsidianProtocolHandler): void
}

export class PluginObsidianProtocolHandlerRegistrar implements ObsidianProtocolHandlerRegistrar {
  private readonly plugin: Plugin;
  public constructor(plugin: Plugin) {
    this.plugin = plugin;
  }

  public registerObsidianProtocolHandler(action: string, handler: ObsidianProtocolHandler): void {
    this.plugin.registerObsidianProtocolHandler(action, handler);
  }
}
