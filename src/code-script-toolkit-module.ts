import type { Plugin as ObsidianPlugin } from 'obsidian';

import type {
  RegisterTempPluginParams,
  TempPluginClass
} from './code-button-context.ts';

/**
 * Helper functions of the plugin.
 */
export interface CodeScriptToolkitModule {
  /**
   * Get a temp plugin by class name or class itself.
   *
   * @param tempPluginClass - The class name or class itself of the temp plugin.
   * @returns The temp plugin.
   */
  getTempPlugin(tempPluginClass: string | TempPluginClass): null | ObsidianPlugin;

  /**
   * Register a temporary plugin.
   * @param tempPluginClass - The class of the temporary plugin.
   * @param cssText - The CSS text of the temporary plugin (optional).
   */
  registerTempPlugin<TPlugin extends ObsidianPlugin = ObsidianPlugin>(params: RegisterTempPluginParams<TPlugin>): Promise<null | TPlugin>;

  /**
   * Unregister a temporary plugin.
   * @param tempPluginClass - The class name or class itself of the temporary plugin.
   */
  unregisterTempPlugin(tempPluginClass: string | TempPluginClass): void;
}
