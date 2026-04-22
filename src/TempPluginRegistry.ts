import type { Plugin as ObsidianPlugin } from 'obsidian';

import { Notice } from 'obsidian';
import { printError } from 'obsidian-dev-utils/error';

import type { TempPluginClass } from './CodeButtonContext.ts';
import type { Plugin } from './Plugin.ts';

import { UnloadTempPluginCommand } from './Commands/UnloadTempPluginCommand.ts';
import { clear } from 'node:console';

const tempPlugins = new Map<string, ObsidianPlugin>();
const defaultTempPluginClassName = '_AnonymousPlugin';

export function getTempPlugin(tempPluginClass: string | TempPluginClass): null | ObsidianPlugin {
  const tempPluginClassName = (typeof tempPluginClass === 'string' ? tempPluginClass : tempPluginClass.name) || defaultTempPluginClassName;
  const id = makeTempPluginId(tempPluginClassName);
  return tempPlugins.get(id) ?? null;
}

export async function registerTempPlugin<T extends ObsidianPlugin = ObsidianPlugin>(plugin: Plugin, tempPluginClass: TempPluginClass<T>, cssText?: string): Promise<null | T> {
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

  let styleEl: HTMLStyleElement | null = null;
  let unloadTempPluginCommand: null | UnloadTempPluginCommand = null;

  const originalUnload = tempPlugin.unload.bind(tempPlugin);
  tempPlugin.unload = (): void => {
    tempPlugins.delete(id);
    if (unloadTempPluginCommand) {
      plugin.removeCommand(unloadTempPluginCommand.originalId);
    }
    styleEl?.remove();
    try {
      originalUnload();
    } catch (error) {
      new Notice(`Failed to unload Temp Plugin: ${tempPluginClassName}. See console for details.`);
      printError(error);
    }
    if (!plugin.settings.disableTempPluginLoadingNotifications) {
      new Notice(`Unregistered Temp Plugin: ${tempPluginClassName}.`);
    }
  };

  type LoadFn = () => Promise<void>;

  const loadFn = tempPlugin.load.bind(tempPlugin) as LoadFn;

  function onError(error: unknown): null {
    new Notice(`Failed to load Temp Plugin: ${tempPluginClassName}. See console for details.`);
    printError(error);
    tempPlugin.unload();
    return null;
  }

  const obsidianPluginTimeout = 3000;
  const loadTimeout = setTimeout(() => {
    new Notice(`Temp Plugin "${tempPluginClassName}" is taking long to load.`);
  }, obsidianPluginTimeout);

  let loadPromise: Promise<void>;
  try {
    loadPromise = loadFn();
  } catch (error) {
    clearTimeout(loadTimeout);
    return onError(error);
  }

  // Add styles after sync load but before async load to mimic Obsidian's behavior
  if (cssText) {
    // eslint-disable-next-line obsidianmd/no-forbidden-elements -- Need dynamic `style` element.
    styleEl = document.head.createEl('style', {
      attr: { id },
      text: cssText
    });
  }

  try {
    await loadPromise;
  } catch (error) {
    return onError(error);
  } finally {
    clearTimeout(loadTimeout);
  }

  unloadTempPluginCommand = new UnloadTempPluginCommand(plugin, tempPlugin, tempPluginClassName);
  unloadTempPluginCommand.register();

  if (!plugin.settings.disableTempPluginLoadingNotifications) {
    new Notice(`Loaded Temp Plugin: ${tempPluginClassName}.`);
  }

  return tempPlugin;
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
