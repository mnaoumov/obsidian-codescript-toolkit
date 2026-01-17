import type { App } from 'obsidian';
import type { Promisable } from 'type-fest';

import { Notice } from 'obsidian';
import { selectItem } from 'obsidian-dev-utils/obsidian/Modals/SelectItem';
import {
  basename,
  join
} from 'obsidian-dev-utils/Path';

import type { Plugin } from './Plugin.ts';

import { getCodeScriptToolkitNoteSettings } from './CodeScriptToolkitNoteSettings.ts';
import {
  invoke,
  INVOKE_SCRIPT_FILE_COMMAND_NAME_PREFIX,
  InvokeScriptCommand
} from './Commands/InvokeScriptCommand.ts';
import { requireVaultScriptAsync } from './RequireHandlerUtils.ts';

export interface Script {
  invoke(app: App): Promisable<void>;
}

interface StartupScript extends Script {
  cleanup?(app: App): Promisable<void>;
}

const extensions = ['.js', '.cjs', '.mjs', '.ts', '.cts', '.mts'];
let startupScript: null | StartupScript = null;

export async function cleanupStartupScript(plugin: Plugin): Promise<void> {
  if (!startupScript) {
    return;
  }

  await startupScript.cleanup?.(plugin.app);
  // eslint-disable-next-line require-atomic-updates -- Ignore possible race condition.
  startupScript = null;
}

export async function invokeStartupScript(plugin: Plugin): Promise<void> {
  if (startupScript) {
    throw new Error('Startup script already invoked');
  }

  const startupScriptPath = await validateStartupScript(plugin);
  if (!startupScriptPath) {
    return;
  }

  // eslint-disable-next-line require-atomic-updates -- Ignore possible race condition.
  startupScript = await requireVaultScriptAsync(startupScriptPath) as StartupScript;
  await startupScript.invoke(plugin.app);
}

export async function registerInvocableScripts(plugin: Plugin): Promise<void> {
  const commands = plugin.app.commands.listCommands().filter((c) => c.id.startsWith(`${plugin.manifest.id}:${INVOKE_SCRIPT_FILE_COMMAND_NAME_PREFIX}`));
  for (const command of commands) {
    plugin.app.commands.removeCommand(command.id);
  }

  const invocableScriptsFolder = plugin.settings.getInvocableScriptsFolder();

  if (!invocableScriptsFolder) {
    return;
  }

  if (!await plugin.app.vault.adapter.exists(invocableScriptsFolder)) {
    const message = `Invocable scripts folder not found: ${invocableScriptsFolder}`;
    new Notice(message);
    console.error(message);
    return;
  }

  const scriptFiles = await getAllScriptFiles(plugin.app, plugin.settings.getInvocableScriptsFolder(), '');

  for (const scriptFile of scriptFiles) {
    new InvokeScriptCommand(plugin, scriptFile).register();
  }
}

export async function reloadStartupScript(plugin: Plugin): Promise<void> {
  await cleanupStartupScript(plugin);
  await invokeStartupScript(plugin);
}

export async function selectAndInvokeScript(plugin: Plugin): Promise<void> {
  const app = plugin.app;
  const invocableScriptsFolder = plugin.settings.getInvocableScriptsFolder();
  let scriptFiles: string[];

  if (!invocableScriptsFolder) {
    scriptFiles = ['Error: No Invocable scripts folder specified in the settings'];
  } else if (await app.vault.adapter.exists(invocableScriptsFolder)) {
    scriptFiles = await getAllScriptFiles(app, invocableScriptsFolder, '');
  } else {
    scriptFiles = [`Error: Invocable scripts folder not found: ${invocableScriptsFolder}`];
  }

  const scriptFile = await selectItem({
    app,
    items: scriptFiles,
    itemTextFunc: (script) => script,
    placeholder: 'Choose a script to invoke'
  });

  if (scriptFile === null) {
    plugin.consoleDebug('No script selected');
    return;
  }

  if (!scriptFile.startsWith('Error:')) {
    await invoke(plugin, join(invocableScriptsFolder, scriptFile));
  }
}

async function getAllScriptFiles(app: App, scriptsFolder: string, folder: string): Promise<string[]> {
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
    const subFiles = await getAllScriptFiles(app, scriptsFolder, join(folder, folderName));
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

async function validateStartupScript(plugin: Plugin, shouldWarnOnNotConfigured = false): Promise<null | string> {
  const startupScriptPath = plugin.settings.getStartupScriptPath();
  if (!startupScriptPath) {
    if (shouldWarnOnNotConfigured) {
      const message = 'Startup script is not configured';
      new Notice(message);
      console.warn(message);
    }
    return null;
  }

  if (!await plugin.app.vault.exists(startupScriptPath)) {
    const message = `Startup script not found: ${startupScriptPath}`;
    new Notice(message);
    console.error(message);
    return null;
  }

  return startupScriptPath;
}
