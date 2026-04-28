import type { App } from 'obsidian';
import type { ActiveFileProvider } from 'obsidian-dev-utils/obsidian/active-file-provider';
import type { CommandRegistrar } from 'obsidian-dev-utils/obsidian/command-registrar';
import type { MenuEventRegistrar } from 'obsidian-dev-utils/obsidian/menu-event-registrar';

import type { TempPluginClass } from './code-button-context.ts';
import type { CodeScriptToolkitModule } from './code-script-toolkit-module.ts';

import {
  TempPluginRegistry,
  unregisterTempPlugin
} from './temp-plugin-registry.ts';

interface CreateCodeScriptToolkitModuleParams {
  readonly activeFileProvider: ActiveFileProvider;
  readonly app: App;
  readonly commandRegistrar: CommandRegistrar;
  readonly menuEventRegistrar: MenuEventRegistrar;
  readonly pluginName: string;
  readonly tempPluginRegistry: TempPluginRegistry;
}
export function createCodeScriptToolkitModule(params: CreateCodeScriptToolkitModuleParams): CodeScriptToolkitModule {
  return {
    registerTempPlugin(tempPluginClass: TempPluginClass, cssText?: string): void {
      params.tempPluginRegistry.registerTempPlugin({
        cssText: cssText ?? '',
        tempPluginClass
      });
    },
    unregisterTempPlugin(tempPluginClassName: string): void {
      unregisterTempPlugin(tempPluginClassName);
    }
  };
}
