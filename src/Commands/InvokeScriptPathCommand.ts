import type { Command } from 'obsidian';

import {
  App,
  Notice
} from 'obsidian';
import { invokeAsyncSafely } from 'obsidian-dev-utils/Async';
import { printError } from 'obsidian-dev-utils/Error';
import { isMarkdownFile } from 'obsidian-dev-utils/obsidian/FileSystem';
import { join } from 'obsidian-dev-utils/Path';

import type { Plugin } from '../Plugin.ts';
import type { Script } from '../Script.ts';

import { getCodeScriptToolkitNoteSettings } from '../CodeScriptToolkitNoteSettings.ts';
import { requireVaultScriptAsync } from '../RequireHandlerUtils.ts';

export const INVOKE_SCRIPT_FILE_COMMAND_NAME_PREFIX = 'invoke-script-file-';

interface InvokeCommand extends Command {
  app: App;
}

interface ScriptOrCommand extends Partial<Script> {
  invokeCommand?: Partial<Command>;
}

const relativeScriptPathCommandIdMap = new Map<string, string>();

export class InvokeScriptPathCommand {
  public constructor(private readonly plugin: Plugin, private readonly relativeScriptPath: string) {}

  public async register(): Promise<void> {
    let scriptOrCommand: Partial<ScriptOrCommand>;
    try {
      scriptOrCommand = await getScriptOrCommand(this.plugin, this.relativeScriptPath);
    } catch (error) {
      printError(new Error(`Error requiring script: ${this.relativeScriptPath}`, { cause: error }));
      return;
    }

    const invokeCommand = this.extractInvokeCommand(scriptOrCommand);
    rebind(invokeCommand, 'callback');
    rebind(invokeCommand, 'checkCallback');
    rebind(invokeCommand, 'editorCallback');
    rebind(invokeCommand, 'editorCheckCallback');
    try {
      this.plugin.addCommand(invokeCommand);
      rebind(invokeCommand, 'checkCallback');
      relativeScriptPathCommandIdMap.set(this.relativeScriptPath, invokeCommand.id);
    } catch (error) {
      printError(new Error(`Error adding invokeCommand from ${this.relativeScriptPath}`, { cause: error }));
    }
  }

  private extractInvokeCommand(script: ScriptOrCommand): InvokeCommand {
    const baseInvokeCommand = {
      app: this.plugin.app,
      icon: 'play',
      id: `${INVOKE_SCRIPT_FILE_COMMAND_NAME_PREFIX}${this.relativeScriptPath}`,
      name: `Invoke script: ${this.relativeScriptPath}`
    };

    if (script.invokeCommand) {
      return {
        ...baseInvokeCommand,
        ...script.invokeCommand
      };
    }

    if (typeof script.invoke === 'function') {
      return {
        ...baseInvokeCommand,
        callback: (): void => {
          invokeAsyncSafely(async () => {
            try {
              await script.invoke?.(this.plugin.app);
              this.plugin.consoleDebug(`${this.relativeScriptPath} invocable script executed successfully`);
            } catch (error) {
              printError(new Error(`Error invoking ${this.relativeScriptPath}`, { cause: error }));
              new Notice(`Error invoking ${this.relativeScriptPath}. See console for details.`);
            }
          });
        }
      };
    }

    throw new Error(`${this.relativeScriptPath} does not export invoke() function`);
  }
}

export async function invokeScriptPath(plugin: Plugin, relativeScriptPath: string): Promise<void> {
  plugin.consoleDebug(`Invoking script: ${relativeScriptPath}.`);

  const commandId = relativeScriptPathCommandIdMap.get(relativeScriptPath);
  if (!commandId) {
    throw new Error(`No command registered for script path: ${relativeScriptPath}`);
  }
  const command = plugin.app.commands.findCommand(commandId);
  if (!command) {
    throw new Error(`No command registered for script path: ${relativeScriptPath}`);
  }

  if (command.checkCallback) {
    try {
      if (!command.checkCallback(true)) {
        new Notice(`${relativeScriptPath} command check condition not met`);
        return;
      }
    } catch (error) {
      printError(new Error(`Error checking ${relativeScriptPath} command check condition`, { cause: error }));
      new Notice(`Error checking ${relativeScriptPath} command check condition. See console for details.`);
      return;
    }

    try {
      command.checkCallback(false);
      plugin.consoleDebug(`${relativeScriptPath} command executed successfully`);
    } catch (error) {
      printError(new Error(`Error invoking ${relativeScriptPath} command`, { cause: error }));
      new Notice(`Error invoking ${relativeScriptPath} command. See console for details.`);
    }
  } else if (command.callback) {
    try {
      command.callback();
      plugin.consoleDebug(`${relativeScriptPath} command executed successfully`);
    } catch (error) {
      printError(new Error(`Error invoking ${relativeScriptPath} command`, { cause: error }));
      new Notice(`Error invoking ${relativeScriptPath} command. See console for details.`);
    }
  }
}

export function unregisterInvocableCommands(app: App): void {
  for (const commandId of relativeScriptPathCommandIdMap.values()) {
    app.commands.removeCommand(commandId);
  }
  relativeScriptPathCommandIdMap.clear();
}

async function getScriptOrCommand(plugin: Plugin, relativeScriptPath: string): Promise<ScriptOrCommand> {
  const app = plugin.app;
  let vaultScriptPath = join(plugin.settings.getInvocableScriptsFolder(), relativeScriptPath);
  if (!await app.vault.adapter.exists(vaultScriptPath)) {
    throw new Error(`Script not found: '${relativeScriptPath}'.`);
  }

  if (isMarkdownFile(app, vaultScriptPath)) {
    const settings = await getCodeScriptToolkitNoteSettings(app, vaultScriptPath);
    if (!settings.isInvocable) {
      throw new Error(`Script is not invocable: '${relativeScriptPath}'.`);
    }
    if (settings.invocableCodeScriptName) {
      vaultScriptPath += `?codeScriptName=${settings.invocableCodeScriptName}`;
    }
  }
  return await requireVaultScriptAsync(vaultScriptPath) as Partial<ScriptOrCommand>;
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- We need T to get proper prop type.
function rebind<T extends keyof InvokeCommand>(invokeCommand: InvokeCommand, prop: T): void {
  if (typeof invokeCommand[prop] === 'function') {
    invokeCommand[prop] = invokeCommand[prop].bind(invokeCommand) as InvokeCommand[T];
  }
}
