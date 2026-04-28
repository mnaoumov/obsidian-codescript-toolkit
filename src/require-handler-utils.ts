import type { App } from 'obsidian';
import type { ActiveFileProvider } from 'obsidian-dev-utils/obsidian/active-file-provider';
import type { CommandRegistrar } from 'obsidian-dev-utils/obsidian/command-registrar';
import type { MenuEventRegistrar } from 'obsidian-dev-utils/obsidian/menu-event-registrar';
import type { ConsoleDebugComponent } from 'obsidian-dev-utils/obsidian/plugin/components/console-debug-component';

import type { PluginSettingsComponent } from './plugin-settings-component.ts';

import { getPlatformDependencies } from './platform-dependencies.ts';
import { VAULT_ROOT_PREFIX } from './require-handler.ts';

interface RequireStringAsyncParams {
  readonly activeFileProvider: ActiveFileProvider;
  readonly app: App;
  readonly commandRegistrar: CommandRegistrar;
  readonly consoleDebugComponent: ConsoleDebugComponent;
  readonly menuEventRegistrar: MenuEventRegistrar;
  readonly path: string;
  readonly pluginName: string;
  readonly pluginSettingsComponent: PluginSettingsComponent;
  readonly source: string;
  readonly urlSuffix?: string;
}

interface RequireVaultScriptAsyncParams {
  readonly activeFileProvider: ActiveFileProvider;
  readonly app: App;
  readonly commandRegistrar: CommandRegistrar;
  readonly consoleDebugComponent: ConsoleDebugComponent;
  readonly id: string;
  readonly menuEventRegistrar: MenuEventRegistrar;
  readonly pluginName: string;
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
