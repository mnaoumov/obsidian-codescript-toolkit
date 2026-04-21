import type { Plugin as ObsidianPlugin } from 'obsidian';

import { Notice } from 'obsidian';
import { invokeAsyncSafely } from 'obsidian-dev-utils/async';
import { printError } from 'obsidian-dev-utils/error';

import type { TempPluginClass } from './CodeButtonContext.ts';
import type { Plugin } from './Plugin.ts';

import { UnloadTempPluginCommand } from './Commands/UnloadTempPluginCommand.ts';

const tempPlugins = new Map<string, ObsidianPlugin>();
const defaultTempPluginClassName = '_AnonymousPlugin';

export function getTempPlugin(tempPluginClass: string | TempPluginClass): null | ObsidianPlugin {
  const tempPluginClassName = (typeof tempPluginClass === 'string' ? tempPluginClass : tempPluginClass.name) || defaultTempPluginClassName;
  const id = makeTempPluginId(tempPluginClassName);
  return tempPlugins.get(id) ?? null;
}

export function registerTempPlugin(plugin: Plugin, tempPluginClass: TempPluginClass, cssText?: string): void {
  const tempPluginClassName = tempPluginClass.name || defaultTempPluginClassName;
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
    if (!plugin.settings.disableTempPluginLoadingNotifications) {
      new Notice(`Loaded Temp Plugin: ${tempPluginClassName}.`);
    }
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
      if (!plugin.settings.disableTempPluginLoadingNotifications) {
        new Notice(`Unregistered Temp Plugin: ${tempPluginClassName}.`);
      }
      styleEl?.remove();
    };
  });
}

export function unloadTempPlugins(): void {
  for (const tempPlugin of tempPlugins.values()) {
    tempPlugin.unload();
  }
}

export function unregisterTempPlugin(tempPluginClass: string | TempPluginClass): void {
  const tempPluginClassName = (typeof tempPluginClass === 'string' ? tempPluginClass : tempPluginClass.name) || defaultTempPluginClassName;
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
