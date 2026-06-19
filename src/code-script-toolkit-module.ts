import type { Plugin as ObsidianPlugin } from 'obsidian';

import type {
  RegisterTempPluginParams,
  TempPluginClass
} from './code-button-context.ts';

export interface CodeScriptToolkitModule {
  getTempPlugin(tempPluginClass: string | TempPluginClass): null | ObsidianPlugin;

  registerTempPlugin<TPlugin extends ObsidianPlugin = ObsidianPlugin>(params: RegisterTempPluginParams<TPlugin>): Promise<null | TPlugin>;

  unregisterTempPlugin(tempPluginClass: string | TempPluginClass): void;
}
