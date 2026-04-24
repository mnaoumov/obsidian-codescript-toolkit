import type { Plugin as ObsidianPlugin } from 'obsidian';

import { Notice } from 'obsidian';
import { invokeAsyncSafely } from 'obsidian-dev-utils/async';
import { printError } from 'obsidian-dev-utils/error';

import type { TempPluginClass } from './code-button-context.ts';

import { UnloadTempPluginCommandHandler } from './commands/unload-temp-plugin-command.ts';
import type { CodeScriptToolkitComponent } from './code-script-toolkit-component.ts';
import { CommandHandlerComponent } from 'obsidian-dev-utils/obsidian/command-handlers/command-handler-component';

const tempPlugins = new Map<string, ObsidianPlugin>();

export function registerTempPlugin(plugin: CodeScriptToolkitComponent, tempPluginClass: TempPluginClass, cssText?: string): void {
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

    const unloadTempPluginCommandHandler = new UnloadTempPluginCommandHandler(tempPlugin, tempPluginClassName, plugin.plugin.manifest.name);
    const commandId = unloadTempPluginCommandHandler.buildCommand().id;
    plugin.addChild(new CommandHandlerComponent(plugin.plugin, unloadTempPluginCommandHandler));

    const originalUnload = tempPlugin.unload.bind(tempPlugin);
    tempPlugin.unload = (): void => {
      try {
        originalUnload();
      } catch (error) {
        new Notice(`Failed to unload Temp Plugin: ${tempPluginClassName}. See console for details.`);
        printError(error);
      }
      tempPlugins.delete(id);
      plugin.removeCommand(commandId);
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
