import type { Plugin as ObsidianPlugin } from 'obsidian';

import type {
  RegisterTempPluginParams as RegisterTemporaryPluginParams,
  // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
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
  // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
  getTempPlugin(tempPluginClass: string | TempPluginClass): null | ObsidianPlugin;

  /**
   * Register a temporary plugin.
   * @param tempPluginClass - The class of the temporary plugin.
   * @param cssText - The CSS text of the temporary plugin (optional).
   */
  // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
  registerTempPlugin<TPlugin extends ObsidianPlugin = ObsidianPlugin>(params: RegisterTemporaryPluginParams<TPlugin>): Promise<null | TPlugin>;

  /**
   * Unregister a temporary plugin.
   * @param tempPluginClass - The class name or class itself of the temporary plugin.
   */
  // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
  unregisterTempPlugin(tempPluginClass: string | TempPluginClass): void;
}
