import type { Plugin as ObsidianPlugin } from 'obsidian';

import type { TempPluginClass } from './CodeButtonContext.ts';
import type { CodeScriptToolkitModule } from './CodeScriptToolkitModule.ts';
import type { Plugin } from './Plugin.ts';

import {
  getTempPlugin,
  registerTempPlugin,
  unregisterTempPlugin
} from './TempPluginRegistry.ts';

export function createCodeScriptToolkitModule(plugin: Plugin): CodeScriptToolkitModule {
  return {
    getTempPlugin(tempPluginClass: string | TempPluginClass): null | ObsidianPlugin {
      return getTempPlugin(tempPluginClass);
    },
    registerTempPlugin(tempPluginClass: TempPluginClass, cssText?: string): void {
      registerTempPlugin(plugin, tempPluginClass, cssText);
    },
    unregisterTempPlugin(tempPluginClassName: string | TempPluginClass): void {
      unregisterTempPlugin(tempPluginClassName);
    }
  };
}
