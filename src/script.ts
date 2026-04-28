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

interface ScriptManagerConstructorParams {
  readonly activeFileProvider: ActiveFileProvider;
  readonly app: App;
  readonly commandRegistrar: CommandRegistrar;
  readonly consoleDebugComponent: ConsoleDebugComponent;
  readonly menuEventRegistrar: MenuEventRegistrar;
  readonly pluginName: string;
  readonly pluginSettingsComponent: PluginSettingsComponent;
  readonly requireHandlerFactory: RequireHandlerFactory;
}

export class ScriptManager {
  private readonly activeFileProvider: ActiveFileProvider;
  private readonly app: App;
  private readonly commandRegistrar: CommandRegistrar;
  private readonly consoleDebugComponent: ConsoleDebugComponent;
  private readonly menuEventRegistrar: MenuEventRegistrar;
  private readonly pluginName: string;
  private readonly pluginSettingsComponent: PluginSettingsComponent;
  private readonly requireHandlerFactory: RequireHandlerFactory;

  public constructor(private readonly params: ScriptManagerConstructorParams) {
    this.app = this.params.app;
    this.pluginSettingsComponent = this.params.pluginSettingsComponent;
    this.requireHandlerFactory = this.params.requireHandlerFactory;
    this.activeFileProvider = this.params.activeFileProvider;
    this.commandRegistrar = this.params.commandRegistrar;
    this.consoleDebugComponent = this.params.consoleDebugComponent;
    this.menuEventRegistrar = this.params.menuEventRegistrar;
    this.pluginName = this.params.pluginName;
  }

  public async registerInvocableScripts(): Promise<void> {
    unregisterInvocableCommands(this.app);

    const invocableScriptsFolder = this.pluginSettingsComponent.settings.getInvocableScriptsFolder();

    if (!invocableScriptsFolder) {
      return;
    }

    if (!await this.app.vault.adapter.exists(invocableScriptsFolder)) {
      const message = `Invocable scripts folder not found: ${invocableScriptsFolder}`;
      new Notice(message);
      console.error(message);
      return;
    }

    const scriptPaths = await getAllScriptPaths(this.app, this.pluginSettingsComponent.settings.getInvocableScriptsFolder(), '');

    for (const scriptPath of scriptPaths) {
      await new InvokeScriptPathCommand({
        activeFileProvider: this.activeFileProvider,
        app: this.app,
        commandRegistrar: this.commandRegistrar,
        consoleDebugComponent: this.consoleDebugComponent,
        menuEventRegistrar: this.menuEventRegistrar,
        pluginName: this.pluginName,
        pluginSettingsComponent: this.pluginSettingsComponent,
        relativeScriptPath: scriptPath,
        requireHandlerFactory: this.requireHandlerFactory
      }).register();
    }
  }

  public async selectAndInvokeScript(): Promise<void> {
    const invocableScriptsFolder = this.pluginSettingsComponent.settings.getInvocableScriptsFolder();
    let scriptPaths: string[];

    if (!invocableScriptsFolder) {
      scriptPaths = ['Error: No Invocable scripts folder specified in the settings'];
    } else if (await this.app.vault.adapter.exists(invocableScriptsFolder)) {
      scriptPaths = await getAllScriptPaths(this.app, invocableScriptsFolder, '');
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
      this.consoleDebugComponent.debug('No script selected');
      return;
    }

    if (!scriptPath.startsWith('Error:')) {
      invokeScriptPath({
        app: this.app,
        consoleDebugComponent: this.consoleDebugComponent,
        relativeScriptPath: scriptPath
      });
    }
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
