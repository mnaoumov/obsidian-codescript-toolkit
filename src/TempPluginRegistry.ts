import type { Plugin as ObsidianPlugin } from 'obsidian';

import { Notice } from 'obsidian';
import { invokeAsyncSafely } from 'obsidian-dev-utils/Async';
import { printError } from 'obsidian-dev-utils/Error';

import type { TempPluginClass } from './CodeButtonContext.ts';
import type { Plugin } from './Plugin.ts';

import { UnloadTempPluginCommand } from './Commands/UnloadTempPluginCommand.ts';

const tempPlugins = new Map<string, ObsidianPlugin>();

export function registerTempPlugin(plugin: Plugin, tempPluginClass: TempPluginClass, cssText?: string): void {
  const tempPluginClassName = tempPluginClass.name || '_AnonymousPlugin';
  const app = plugin.app;
  const id = makeTempPluginId(tempPluginClassName);

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

  tempPlugins.set(id, tempPlugin);

  type LoadFn = () => Promise<void>;

  const loadFn = tempPlugin.load.bind(tempPlugin) as LoadFn;

  invokeAsyncSafely(async () => {
    let isLoaded = false;
    try {
      await loadFn();
      isLoaded = true;
    } catch (error) {
      new Notice(`Failed to load Temp Plugin: ${tempPluginClassName}. See console for details.`);
      printError(error);
    }

    if (!isLoaded) {
      return;
    }

    let styleEl: HTMLStyleElement | null = null;
    new Notice(`Loaded Temp Plugin: ${tempPluginClassName}.`);
    if (cssText) {
      // eslint-disable-next-line obsidianmd/no-forbidden-elements -- Need dynamic `style` element.
      styleEl = document.head.createEl('style', {
        attr: { id },
        text: cssText
      });
    }

    const unloadTempPluginCommand = new UnloadTempPluginCommand(plugin, tempPlugin, tempPluginClassName);
    unloadTempPluginCommand.register();

    const originalUnload = tempPlugin.unload.bind(tempPlugin);
    tempPlugin.unload = (): void => {
      try {
        originalUnload();
      } catch (error) {
        new Notice(`Failed to unload Temp Plugin: ${tempPluginClassName}. See console for details.`);
        printError(error);
      }
      tempPlugins.delete(id);
      plugin.removeCommand(unloadTempPluginCommand.originalId);
      new Notice(`Unregistered Temp Plugin: ${tempPluginClassName}.`);
      styleEl?.remove();
    };
  });
}

export function unloadTempPlugins(): void {
  for (const tempPlugin of tempPlugins.values()) {
    tempPlugin.unload();
  }
}

export function unregisterTempPlugin(tempPluginClassName: string): void {
  const id = makeTempPluginId(tempPluginClassName);
  const tempPlugin = tempPlugins.get(id);
  if (tempPlugin) {
    tempPlugin.unload();
  } else {
    new Notice(`Temp Plugin was not registered: ${tempPluginClassName}.`);
  }
}

function makeTempPluginId(tempPluginClassName: string): string {
  return `__temp-plugin-${tempPluginClassName}`;
}
