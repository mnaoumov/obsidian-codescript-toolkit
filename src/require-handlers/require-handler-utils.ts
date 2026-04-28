import type { App } from 'obsidian';
import type { ActiveFileProvider } from 'obsidian-dev-utils/obsidian/active-file-provider';
import type { CommandRegistrar } from 'obsidian-dev-utils/obsidian/command-registrar';
import type { MenuEventRegistrar } from 'obsidian-dev-utils/obsidian/menu-event-registrar';
import type { ConsoleDebugComponent } from 'obsidian-dev-utils/obsidian/plugin/components/console-debug-component';

import type { PluginSettingsComponent } from '../plugin-settings-component.ts';
import type { RequireHandlerFactory } from './require-handler-factory.ts';
import type { PluginRequireFn } from './require-handler.ts';

import { VAULT_ROOT_PREFIX } from './require-handler.ts';

interface RequireStringAsyncParams {
  readonly activeFileProvider: ActiveFileProvider;
  readonly app: App;
  readonly commandRegistrar: CommandRegistrar;
  readonly consoleDebugComponent: ConsoleDebugComponent;
  readonly menuEventRegistrar: MenuEventRegistrar;
  readonly path: string;
  readonly pluginName: string;
  readonly pluginRequire: PluginRequireFn;
  readonly pluginSettingsComponent: PluginSettingsComponent;
  readonly requireHandlerFactory: RequireHandlerFactory;
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
  readonly pluginRequire: PluginRequireFn;
  readonly pluginSettingsComponent: PluginSettingsComponent;
  readonly requireHandlerFactory: RequireHandlerFactory;
}

export async function requireStringAsync(params: RequireStringAsyncParams): Promise<unknown> {
  return params.requireHandlerFactory.requireStringAsync(params.source, params.path, params.urlSuffix);
}

export async function requireVaultScriptAsync(params: RequireVaultScriptAsyncParams): Promise<unknown> {
  return params.requireHandlerFactory.requireAsync(VAULT_ROOT_PREFIX + params.id);
}
