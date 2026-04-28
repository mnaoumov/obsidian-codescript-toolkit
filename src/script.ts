import type { App } from 'obsidian';
import type { ActiveFileProvider } from 'obsidian-dev-utils/obsidian/active-file-provider';
import type { CommandRegistrar } from 'obsidian-dev-utils/obsidian/command-registrar';
import type { MenuEventRegistrar } from 'obsidian-dev-utils/obsidian/menu-event-registrar';
import type { ConsoleDebugComponent } from 'obsidian-dev-utils/obsidian/plugin/components/console-debug-component';
import type { Promisable } from 'type-fest';

import { Notice } from 'obsidian';
import { selectItem } from 'obsidian-dev-utils/obsidian/modals/select-item';
import {
  basename,
  join
} from 'obsidian-dev-utils/path';

import type { PluginSettingsComponent } from './plugin-settings-component.ts';
import type { RequireHandlerFactory } from './require-handlers/require-handler-factory.ts';

import { getCodeScriptToolkitNoteSettings } from './code-script-toolkit-note-settings.ts';
import {
  invokeScriptPath,
  InvokeScriptPathCommand,
  unregisterInvocableCommands
} from './command-handlers/invoke-script-path-command-handler.ts';

export interface Script {
  invoke(app: App): Promisable<void>;
}

const extensions = ['.js', '.cjs', '.mjs', '.ts', '.cts', '.mts'];

interface RegisterInvocableScriptsParams {
  readonly activeFileProvider: ActiveFileProvider;
  readonly app: App;
  readonly commandRegistrar: CommandRegistrar;
  readonly consoleDebugComponent: ConsoleDebugComponent;
  readonly menuEventRegistrar: MenuEventRegistrar;
  readonly pluginName: string;
  readonly pluginSettingsComponent: PluginSettingsComponent;
  readonly requireHandlerFactory: RequireHandlerFactory;
}

interface SelectAndInvokeScriptParams {
  readonly app: App;
  readonly consoleDebugComponent: ConsoleDebugComponent;
  readonly pluginSettingsComponent: PluginSettingsComponent;
}

export async function registerInvocableScripts(params: RegisterInvocableScriptsParams): Promise<void> {
  const { app, pluginSettingsComponent } = params;
  unregisterInvocableCommands(params.app);

  const invocableScriptsFolder = pluginSettingsComponent.settings.getInvocableScriptsFolder();

  if (!invocableScriptsFolder) {
    return;
  }

  if (!await app.vault.adapter.exists(invocableScriptsFolder)) {
    const message = `Invocable scripts folder not found: ${invocableScriptsFolder}`;
    new Notice(message);
    console.error(message);
    return;
  }

  const scriptPaths = await getAllScriptPaths(app, pluginSettingsComponent.settings.getInvocableScriptsFolder(), '');

  for (const scriptPath of scriptPaths) {
    await new InvokeScriptPathCommand({
      activeFileProvider: params.activeFileProvider,
      app,
      commandRegistrar: params.commandRegistrar,
      consoleDebugComponent: params.consoleDebugComponent,
      menuEventRegistrar: params.menuEventRegistrar,
      pluginName: params.pluginName,
      pluginSettingsComponent,
      relativeScriptPath: scriptPath,
      requireHandlerFactory: params.requireHandlerFactory
    }).register();
  }
}

export async function selectAndInvokeScript(params: SelectAndInvokeScriptParams): Promise<void> {
  const { app, consoleDebugComponent, pluginSettingsComponent } = params;
  const invocableScriptsFolder = pluginSettingsComponent.settings.getInvocableScriptsFolder();
  let scriptPaths: string[];

  if (!invocableScriptsFolder) {
    scriptPaths = ['Error: No Invocable scripts folder specified in the settings'];
  } else if (await app.vault.adapter.exists(invocableScriptsFolder)) {
    scriptPaths = await getAllScriptPaths(app, invocableScriptsFolder, '');
  } else {
    scriptPaths = [`Error: Invocable scripts folder not found: ${invocableScriptsFolder}`];
  }

  const scriptPath = await selectItem({
    app,
    items: scriptPaths,
    itemTextFunc: (script) => script,
    placeholder: 'Choose a script to invoke'
  });

  if (scriptPath === null) {
    consoleDebugComponent.debug('No script selected');
    return;
  }

  if (!scriptPath.startsWith('Error:')) {
    invokeScriptPath({
      app,
      consoleDebugComponent: params.consoleDebugComponent,
      relativeScriptPath: scriptPath
    });
  }
}

async function getAllScriptPaths(app: App, scriptsFolder: string, folder: string): Promise<string[]> {
  const adapter = app.vault.adapter;
  const files: string[] = [];
  const listedFiles = await adapter.list(join(scriptsFolder, folder));
  for (const fileName of getSortedBaseNames(listedFiles.files)) {
    const path = join(scriptsFolder, folder, fileName);
    const lowerCasedFileName = fileName.toLowerCase();
    if (await isInvocableMarkdownFile(app, path) || extensions.some((ext) => lowerCasedFileName.endsWith(ext))) {
      files.push(join(folder, fileName));
    }
  }
  for (const folderName of getSortedBaseNames(listedFiles.folders)) {
    const subFiles = await getAllScriptPaths(app, scriptsFolder, join(folder, folderName));
    files.push(...subFiles);
  }

  return files;
}

function getSortedBaseNames(fullNames: string[]): string[] {
  return fullNames.map((file) => basename(file)).sort((a, b) => a.localeCompare(b));
}

async function isInvocableMarkdownFile(app: App, path: string): Promise<boolean> {
  return (await getCodeScriptToolkitNoteSettings(app, path)).isInvocable;
}
