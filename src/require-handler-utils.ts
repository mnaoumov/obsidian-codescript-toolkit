import type { App } from 'obsidian';

import type { PluginSettingsComponent } from './plugin-settings-component.ts';

import { getPlatformDependencies } from './platform-dependencies.ts';
import { VAULT_ROOT_PREFIX } from './require-handler.ts';

interface RequireStringAsyncParams {
  readonly app: App;
  readonly path: string;
  readonly pluginSettingsComponent: PluginSettingsComponent;
  readonly source: string;
  readonly urlSuffix?: string;
}

interface RequireVaultScriptAsyncParams {
  readonly app: App;
  readonly id: string;
  readonly pluginSettingsComponent: PluginSettingsComponent;
}

export async function requireStringAsync(params: RequireStringAsyncParams): Promise<unknown> {
  const platformDependencies = await getPlatformDependencies();
  return await platformDependencies.createRequireHandler(params).requireStringAsync(params.source, params.path, params.urlSuffix);
}

export async function requireVaultScriptAsync(params: RequireVaultScriptAsyncParams): Promise<unknown> {
  const platformDependencies = await getPlatformDependencies();
  return await platformDependencies.createRequireHandler(params).requireAsync(VAULT_ROOT_PREFIX + params.id);
}
