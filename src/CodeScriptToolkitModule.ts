import type { Plugin } from 'obsidian';

import type { TempPluginClass } from './CodeButtonContext.ts';

/**
 * Helper functions of the plugin.
 */
export interface CodeScriptToolkitModule {
  /**
   * Get a temporary plugin.
   * @param tempPluginClass - The class or its name of the temporary plugin.
   */
  getTempPlugin(tempPluginClass: string | TempPluginClass): null | Plugin;

  /**
   * Register a temporary plugin.
   * @param tempPluginClass - The class of the temporary plugin.
   * @param cssText - The CSS text of the temporary plugin (optional).
   */
  registerTempPlugin<T extends Plugin = Plugin>(tempPluginClass: TempPluginClass<T>, cssText?: string): Promise<null | T>;

  /**
   * Unregister a temporary plugin.
   * @param tempPluginClassName - The class name of the temporary plugin.
   */
  unregisterTempPlugin(tempPluginClassName: string | TempPluginClass): void;
}
