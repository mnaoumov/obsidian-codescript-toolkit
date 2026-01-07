import type { Plugin as ObsidianPlugin } from 'obsidian';

import { Notice } from 'obsidian';

import type { TempPluginClass } from './CodeButtonContext.ts';
import type { Plugin } from './Plugin.ts';

const tempPlugins = new Map<string, ObsidianPlugin>();

export function registerTempPlugin(plugin: Plugin, tempPluginClass: TempPluginClass, cssText?: string): void {
  const tempPluginClassName = tempPluginClass.name || '_AnonymousPlugin';
  const app = plugin.app;
  const id = `__temp-plugin-${tempPluginClassName}`;

  const existingPlugin = tempPlugins.get(id);
  if (existingPlugin) {
    existingPlugin.unload();
  }

  const tempPlugin = new tempPluginClass(app, {
    author: '__Temp Plugin created by CodeScript Toolkit',
    description: '__Temp Plugin created by CodeScript Toolkit',
    id,
    minAppVersion: '0.0.1',
    name: `__Temp Plugin ${tempPluginClassName}`,
    version: '0.0.0'
  });

  const unloadCommandId = `unload-temp-plugin-${tempPluginClassName}`;

  tempPlugin.register(() => {
    tempPlugins.delete(id);
    plugin.removeCommand(unloadCommandId);
    new Notice(`Unloaded Temp Plugin: ${tempPluginClassName}.`);
    document.getElementById(id)?.remove();
  });

  tempPlugins.set(id, tempPlugin);
  plugin.addChild(tempPlugin);
  new Notice(`Loaded Temp Plugin: ${tempPluginClassName}.`);
  if (cssText) {
    // eslint-disable-next-line obsidianmd/no-forbidden-elements -- Need dynamic `style` element.
    document.head.createEl('style', {
      attr: { id },
      text: cssText
    });
  }

  plugin.addCommand({
    callback: () => {
      tempPlugin.unload();
    },
    id: unloadCommandId,
    name: `Unload Temp Plugin: ${tempPluginClassName}`
  });
}

export function unloadTempPlugins(): void {
  for (const tempPlugin of tempPlugins.values()) {
    tempPlugin.unload();
  }
}
