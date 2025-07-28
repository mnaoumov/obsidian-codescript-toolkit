import type { App } from 'obsidian';
import type { Promisable } from 'type-fest';

import { Notice } from 'obsidian';
import { printError } from 'obsidian-dev-utils/Error';
import { isMarkdownFile } from 'obsidian-dev-utils/obsidian/FileSystem';
import { selectItem } from 'obsidian-dev-utils/obsidian/Modals/SelectItem';
import {
  basename,
  join
} from 'obsidian-dev-utils/Path';

import type { Plugin } from './Plugin.ts';

import { getCodeScriptToolkitNoteSettings } from './CodeScriptToolkitNoteSettings.ts';
import { requireVaultScriptAsync } from './RequireHandlerUtils.ts';

interface CleanupScript extends Script {
  cleanup(app: App): Promisable<void>;
}

interface Script {
  invoke(app: App): Promisable<void>;
}

const extensions = ['.js', '.cjs', '.mjs', '.ts', '.cts', '.mts'];

export async function cleanupStartupScript(plugin: Plugin): Promise<void> {
  const startupScriptPath = await validateStartupScript(plugin);
  if (!startupScriptPath) {
    return;
  }

  const script = await requireVaultScriptAsync(startupScriptPath) as Partial<CleanupScript>;
  await script.cleanup?.(plugin.app);
}

export async function invokeStartupScript(plugin: Plugin): Promise<void> {
  const startupScriptPath = await validateStartupScript(plugin);
  if (!startupScriptPath) {
    return;
  }

  await invoke(plugin, startupScriptPath, true);
}

export async function registerInvocableScripts(plugin: Plugin): Promise<void> {
  const COMMAND_NAME_PREFIX = 'invokeScriptFile-';
  const commands = plugin.app.commands.listCommands().filter((c) => c.id.startsWith(`${plugin.manifest.id}:${COMMAND_NAME_PREFIX}`));
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
    plugin.addCommand({
      callback: async () => {
        await invoke(plugin, join(invocableScriptsFolder, scriptFile));
      },
      id: `${COMMAND_NAME_PREFIX}${scriptFile}`,
      name: `Invoke Script: ${scriptFile}`
    });
  }
}

export async function reloadStartupScript(plugin: Plugin): Promise<void> {
  const startupScriptPath = await validateStartupScript(plugin, true);
  if (!startupScriptPath) {
    return;
  }

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

async function invoke(plugin: Plugin, scriptPath: string, isStartup?: boolean): Promise<void> {
  const app = plugin.app;
  const scriptString = isStartup ? 'startup script' : 'script';
  plugin.consoleDebug(`Invoking ${scriptString}: ${scriptPath}.`);
  try {
    if (!await app.vault.adapter.exists(scriptPath)) {
      throw new Error(`Script not found: '${scriptPath}'.`);
    }

    if (isMarkdownFile(app, scriptPath)) {
      const settings = await getCodeScriptToolkitNoteSettings(app, scriptPath);
      if (!settings.isInvocable) {
        throw new Error(`Script is not invocable: '${scriptPath}'.`);
      }
      if (settings.invocableCodeScriptName) {
        scriptPath += `?codeScriptName=${settings.invocableCodeScriptName}`;
      }
    }
    const script = await requireVaultScriptAsync(scriptPath) as Partial<Script>;
    const invokeFn = script.invoke?.bind(script);
    if (typeof invokeFn !== 'function') {
      throw new Error(`${scriptPath} does not export invoke() function`);
    }
    await invokeFn(app);
    plugin.consoleDebug(`${scriptString} ${scriptPath} executed successfully`);
  } catch (error) {
    new Notice(`Error invoking ${scriptString} ${scriptPath}
See console for details...`);
    printError(new Error(`Error invoking ${scriptString} ${scriptPath}`, { cause: error }));
  }
}

async function isInvocableMarkdownFile(app: App, path: string): Promise<boolean> {
  return !!(await getCodeScriptToolkitNoteSettings(app, path)).isInvocable;
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
