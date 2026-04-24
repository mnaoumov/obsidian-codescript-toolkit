import type { TempPluginClass } from './code-button-context.ts';
import type { CodeScriptToolkitModule } from './code-script-toolkit-module.ts';
import type { Plugin } from './plugin.ts';

import {
  registerTempPlugin,
  unregisterTempPlugin
} from './temp-plugin-registry.ts';

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
