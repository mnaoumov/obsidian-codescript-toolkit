import type { TempPluginClass } from './CodeButtonContext.ts';

/**
 * Helper functions of the plugin.
 */
export interface CodeScriptToolkitModule {
  /**
   * Register a temporary plugin.
   * @param tempPluginClass - The class of the temporary plugin.
   * @param cssText - The CSS text of the temporary plugin (optional).
   */
  registerTempPlugin(tempPluginClass: TempPluginClass, cssText?: string): void;

  /**
   * Unregister a temporary plugin.
   * @param tempPluginClassName - The class name of the temporary plugin.
   */
  unregisterTempPlugin(tempPluginClassName: string): void;
}
