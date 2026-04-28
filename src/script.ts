import type { App } from 'obsidian';
import type { ActiveFileProvider } from 'obsidian-dev-utils/obsidian/active-file-provider';
import type { CommandRegistrar } from 'obsidian-dev-utils/obsidian/command-registrar';
import type { MenuEventRegistrar } from 'obsidian-dev-utils/obsidian/menu-event-registrar';
import type { Promisable } from 'type-fest';

import { Notice } from 'obsidian';
import { selectItem } from 'obsidian-dev-utils/obsidian/modals/select-item';
import {
  basename,
  join
} from 'obsidian-dev-utils/path';

import type { CodeScriptToolkitComponent } from './code-script-toolkit-component.ts';
import type { PluginSettingsComponent } from './plugin-settings-component.ts';

import { getCodeScriptToolkitNoteSettings } from './code-script-toolkit-note-settings.ts';
import {
  invokeScriptPath,
  InvokeScriptPathCommand,
  unregisterInvocableCommands
} from './command-handlers/invoke-script-path-command-handler.ts';
import { requireVaultScriptAsync } from './require-handler-utils.ts';

export interface Script {
  invoke(app: App): Promisable<void>;
}

interface StartupScript extends Script {
  cleanup?(app: App): Promisable<void>;
}

const extensions = ['.js', '.cjs', '.mjs', '.ts', '.cts', '.mts'];
let startupScript: null | StartupScript = null;

interface InvokeStartupScriptParams {
  activeFileProvider: ActiveFileProvider;
  app: App;
  commandRegistrar: CommandRegistrar;
  menuEventRegistrar: MenuEventRegistrar;
  pluginName: string;
  pluginSettingsComponent: PluginSettingsComponent;
}

interface RegisterInvocableScriptsParams {
  activeFileProvider: ActiveFileProvider;
  app: App;
  codeScriptToolkitComponent: CodeScriptToolkitComponent;
  commandRegistrar: CommandRegistrar;
  menuEventRegistrar: MenuEventRegistrar;
  pluginName: string;
  pluginSettingsComponent: PluginSettingsComponent;
}

interface ReloadStartupScriptParams {
  activeFileProvider: ActiveFileProvider;
  app: App;
  commandRegistrar: CommandRegistrar;
  menuEventRegistrar: MenuEventRegistrar;
  pluginName: string;
  pluginSettingsComponent: PluginSettingsComponent;
}

export async function cleanupStartupScript(app: App): Promise<void> {
  if (!startupScript) {
    return;
  }

  await startupScript.cleanup?.(app);
  // eslint-disable-next-line require-atomic-updates -- Ignore possible race condition.
  startupScript = null;
}

export async function invokeStartupScript(params: InvokeStartupScriptParams): Promise<void> {
  const { activeFileProvider, app, commandRegistrar, menuEventRegistrar, pluginSettingsComponent } = params;
  if (startupScript) {
    throw new Error('Startup script already invoked');
  }

  const startupScriptPath = await validateStartupScript(app, pluginSettingsComponent);
  if (!startupScriptPath) {
    return;
  }

  // eslint-disable-next-line require-atomic-updates -- Ignore possible race condition.
  startupScript = await requireVaultScriptAsync({
    activeFileProvider,
    app,
    commandRegistrar,
    id: startupScriptPath,
    menuEventRegistrar,
    pluginName: params.pluginName,
    pluginSettingsComponent
  }) as StartupScript;
  await startupScript.invoke(params.app);
}

export async function registerInvocableScripts(params: RegisterInvocableScriptsParams): Promise<void> {
  const { app, codeScriptToolkitComponent, pluginSettingsComponent } = params;
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
      codeScriptToolkitComponent,
      commandRegistrar: params.commandRegistrar,
      menuEventRegistrar: params.menuEventRegistrar,
      pluginName: params.pluginName,
      pluginSettingsComponent,
      relativeScriptPath: scriptPath
    }).register();
  }
}

export async function reloadStartupScript(params: ReloadStartupScriptParams): Promise<void> {
  const { activeFileProvider, app, commandRegistrar, menuEventRegistrar, pluginSettingsComponent } = params;
  await cleanupStartupScript(app);
  await invokeStartupScript({
    activeFileProvider,
    app,
    commandRegistrar,
    menuEventRegistrar,
    pluginName: params.pluginName,
    pluginSettingsComponent
  });
}

export async function selectAndInvokeScript(
  codeScriptToolkitComponent: CodeScriptToolkitComponent,
  pluginSettingsComponent: PluginSettingsComponent,
  app: App
): Promise<void> {
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
    codeScriptToolkitComponent.consoleDebug('No script selected');
    return;
  }

  if (!scriptPath.startsWith('Error:')) {
    invokeScriptPath(codeScriptToolkitComponent, scriptPath, app);
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

async function validateStartupScript(
  app: App,
  pluginSettingsComponent: PluginSettingsComponent,
  shouldWarnOnNotConfigured = false
): Promise<null | string> {
  const startupScriptPath = pluginSettingsComponent.settings.getStartupScriptPath();
  if (!startupScriptPath) {
    if (shouldWarnOnNotConfigured) {
      const message = 'Startup script is not configured';
      new Notice(message);
      console.warn(message);
    }
    return null;
  }

  if (!await app.vault.exists(startupScriptPath)) {
    const message = `Startup script not found: ${startupScriptPath}`;
    new Notice(message);
    console.error(message);
    return null;
  }

  return startupScriptPath;
}
