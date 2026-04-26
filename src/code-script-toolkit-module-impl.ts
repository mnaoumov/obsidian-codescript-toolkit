import type { App } from 'obsidian';

import type { TempPluginClass } from './code-button-context.ts';
import type { CodeScriptToolkitComponent } from './code-script-toolkit-component.ts';
import type { CodeScriptToolkitModule } from './code-script-toolkit-module.ts';

import {
  registerTempPlugin,
  unregisterTempPlugin
} from './temp-plugin-registry.ts';

export function createCodeScriptToolkitModule(app: App, codeScriptToolkitComponent: CodeScriptToolkitComponent): CodeScriptToolkitModule {
  return {
    registerTempPlugin(tempPluginClass: TempPluginClass, cssText?: string): void {
      registerTempPlugin(app, codeScriptToolkitComponent, tempPluginClass, cssText);
    },
    unregisterTempPlugin(tempPluginClassName: string): void {
      unregisterTempPlugin(tempPluginClassName);
    }
  };
}
