import type { TempPluginClass } from './CodeButtonContext.ts';
import type { CodeScriptToolkitModule } from './CodeScriptToolkitModule.ts';
import type { Plugin } from './Plugin.ts';

import {
  registerTempPlugin,
  unregisterTempPlugin
} from './TempPluginRegistry.ts';

export function createCodeScriptToolkitModule(plugin: Plugin): CodeScriptToolkitModule {
  return {
    registerTempPlugin(tempPluginClass: TempPluginClass, cssText?: string): void {
      registerTempPlugin(plugin, tempPluginClass, cssText);
    },
    unregisterTempPlugin(tempPluginClassName: string): void {
      unregisterTempPlugin(tempPluginClassName);
    }
  };
}
