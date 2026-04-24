import type { PluginSettingsComponent } from './plugin-settings-component.ts';

import { getPlatformDependencies } from './platform-dependencies.ts';
import { VAULT_ROOT_PREFIX } from './require-handler.ts';

export async function requireStringAsync(pluginSettingsComponent: PluginSettingsComponent, source: string, path: string, urlSuffix?: string): Promise<unknown> {
  const platformDependencies = await getPlatformDependencies();
  return await platformDependencies.createRequireHandler(pluginSettingsComponent).requireStringAsync(source, path, urlSuffix);
}

export async function requireVaultScriptAsync(pluginSettingsComponent: PluginSettingsComponent, id: string): Promise<unknown> {
  const platformDependencies = await getPlatformDependencies();
  return await platformDependencies.createRequireHandler(pluginSettingsComponent).requireAsync(VAULT_ROOT_PREFIX + id);
}
