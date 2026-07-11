import type { App } from 'obsidian';
import type { ConsoleDebugComponent } from 'obsidian-dev-utils/obsidian/components/console-debug-component';
import type { PluginNoticeComponent } from 'obsidian-dev-utils/obsidian/components/plugin-notice-component';
import type { Promisable } from 'type-fest';

import { selectItem } from 'obsidian-dev-utils/obsidian/modals/select-item';
import {
  basename,
  join
} from 'obsidian-dev-utils/path';

import type { PluginSettingsComponent } from './plugin-settings-component.ts';

import { getCodeScriptToolkitNoteSettings } from './code-script-toolkit-note-settings.ts';
import { ScriptRegistryComponent } from './script-registry.ts';

export interface Script {
  invoke(app: App): Promisable<void>;
}

const extensions = ['.js', '.cjs', '.mjs', '.ts', '.cts', '.mts'];

interface GetAllScriptPathsParams {
  readonly app: App;
  readonly folder: string;
  readonly scriptsFolder: string;
}

interface ScriptManagerConstructorParams {
  readonly app: App;
  readonly consoleDebugComponent: ConsoleDebugComponent;
  readonly pluginNoticeComponent: PluginNoticeComponent;
  readonly pluginSettingsComponent: PluginSettingsComponent;
  readonly scriptRegistry: ScriptRegistryComponent;
}

export class ScriptManager {
  private readonly app: App;
  private readonly consoleDebugComponent: ConsoleDebugComponent;
  private readonly pluginNoticeComponent: PluginNoticeComponent;
  private readonly pluginSettingsComponent: PluginSettingsComponent;
  private readonly scriptRegistry: ScriptRegistryComponent;

  public constructor(params: ScriptManagerConstructorParams) {
    this.app = params.app;
    this.consoleDebugComponent = params.consoleDebugComponent;
    this.pluginNoticeComponent = params.pluginNoticeComponent;
    this.pluginSettingsComponent = params.pluginSettingsComponent;
    this.scriptRegistry = params.scriptRegistry;
  }

  public async registerInvocableScripts(): Promise<void> {
    this.scriptRegistry.unregisterInvocableCommands();

    const invocableScriptsFolder = this.pluginSettingsComponent.settings.getInvocableScriptsFolder();

    if (!invocableScriptsFolder) {
      return;
    }

    if (!await this.app.vault.adapter.exists(invocableScriptsFolder)) {
      const message = `Invocable scripts folder not found: ${invocableScriptsFolder}`;
      this.pluginNoticeComponent.showNotice(message);
      console.error(message);
      return;
    }

    const scriptPaths = await getAllScriptPaths({ app: this.app, folder: '', scriptsFolder: this.pluginSettingsComponent.settings.getInvocableScriptsFolder() });

    for (const scriptPath of scriptPaths) {
      await this.scriptRegistry.registerScript(scriptPath);
    }
  }

  public async selectAndInvokeScript(): Promise<void> {
    const invocableScriptsFolder = this.pluginSettingsComponent.settings.getInvocableScriptsFolder();
    let scriptPaths: string[];

    if (!invocableScriptsFolder) {
      scriptPaths = ['Error: No Invocable scripts folder specified in the settings'];
    } else if (await this.app.vault.adapter.exists(invocableScriptsFolder)) {
      scriptPaths = await getAllScriptPaths({ app: this.app, folder: '', scriptsFolder: invocableScriptsFolder });
    } else {
      scriptPaths = [`Error: Invocable scripts folder not found: ${invocableScriptsFolder}`];
    }

    const scriptPath = await selectItem({
      app: this.app,
      items: scriptPaths,
      itemTextFunc: (script) => script,
      placeholder: 'Choose a script to invoke'
    });

    if (scriptPath === null) {
      this.consoleDebugComponent.consoleDebug('No script selected');
      return;
    }

    if (!scriptPath.startsWith('Error:')) {
      await this.scriptRegistry.invokeScriptPath(scriptPath);
    }
  }
}

async function getAllScriptPaths(params: GetAllScriptPathsParams): Promise<string[]> {
  const { app, folder, scriptsFolder } = params;
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
    const subFiles = await getAllScriptPaths({ app, folder: join(folder, folderName), scriptsFolder });
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
