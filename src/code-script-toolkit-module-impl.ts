import type { App } from 'obsidian';
import type { ActiveFileProvider } from 'obsidian-dev-utils/obsidian/active-file-provider';
import type { CommandRegistrar } from 'obsidian-dev-utils/obsidian/command-registrar';
import type { MenuEventRegistrar } from 'obsidian-dev-utils/obsidian/menu-event-registrar';

import type { TempPluginClass } from './code-button-context.ts';
import type { CodeScriptToolkitComponent } from './code-script-toolkit-component.ts';
import type { CodeScriptToolkitModule } from './code-script-toolkit-module.ts';

import {
  registerTempPlugin,
  unregisterTempPlugin
} from './temp-plugin-registry.ts';

interface CreateCodeScriptToolkitModuleParams {
  activeFileProvider: ActiveFileProvider;
  app: App;
  codeScriptToolkitComponent: CodeScriptToolkitComponent;
  commandRegistrar: CommandRegistrar;
  menuEventRegistrar: MenuEventRegistrar;
}
export function createCodeScriptToolkitModule(params: CreateCodeScriptToolkitModuleParams): CodeScriptToolkitModule {
  return {
    registerTempPlugin(tempPluginClass: TempPluginClass, cssText?: string): void {
      registerTempPlugin({
        activeFileProvider: params.activeFileProvider,
        app: params.app,
        codeScriptToolkitComponent: params.codeScriptToolkitComponent,
        commandRegistrar: params.commandRegistrar,
        cssText: cssText ?? '',
        menuEventRegistrar: params.menuEventRegistrar,
        tempPluginClass
      });
    },
    unregisterTempPlugin(tempPluginClassName: string): void {
      unregisterTempPlugin(tempPluginClassName);
    }
  };
}
