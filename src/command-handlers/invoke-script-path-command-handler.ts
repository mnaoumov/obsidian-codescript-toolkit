import type { Command } from 'obsidian';
import type { ActiveFileProvider } from 'obsidian-dev-utils/obsidian/active-file-provider';
import type { CommandRegistrar } from 'obsidian-dev-utils/obsidian/command-registrar';
import type { MenuEventRegistrar } from 'obsidian-dev-utils/obsidian/menu-event-registrar';
import type { ConsoleDebugComponent } from 'obsidian-dev-utils/obsidian/plugin/components/console-debug-component';

import {
  App,
  Notice
} from 'obsidian';
import { invokeAsyncSafely } from 'obsidian-dev-utils/async';
import { printError } from 'obsidian-dev-utils/error';
import { isMarkdownFile } from 'obsidian-dev-utils/obsidian/file-system';
import { join } from 'obsidian-dev-utils/path';

import type { PluginSettingsComponent } from '../plugin-settings-component.ts';
import type { RequireHandlerFactory } from '../require-handlers/require-handler-factory.ts';
import type { Script } from '../script.ts';

import { getCodeScriptToolkitNoteSettings } from '../code-script-toolkit-note-settings.ts';

export const INVOKE_SCRIPT_FILE_COMMAND_NAME_PREFIX = 'invoke-script-file-';

interface InvokeCommand extends Command {
  app: App;
}

interface ScriptOrCommand extends Partial<Script> {
  invokeCommand?: Partial<Command>;
}

const relativeScriptPathCommandIdMap = new Map<string, string>();

interface GetScriptOrCommandParams {
  readonly activeFileProvider: ActiveFileProvider;
  readonly app: App;
  readonly commandRegistrar: CommandRegistrar;
  readonly consoleDebugComponent: ConsoleDebugComponent;
  readonly menuEventRegistrar: MenuEventRegistrar;
  readonly pluginName: string;
  readonly pluginSettingsComponent: PluginSettingsComponent;
  readonly relativeScriptPath: string;
  readonly requireHandlerFactory: RequireHandlerFactory;
}

interface InvokeScriptPathCommandConstructorParams {
  readonly activeFileProvider: ActiveFileProvider;
  readonly app: App;
  readonly commandRegistrar: CommandRegistrar;
  readonly consoleDebugComponent: ConsoleDebugComponent;
  readonly menuEventRegistrar: MenuEventRegistrar;
  readonly pluginName: string;
  readonly pluginSettingsComponent: PluginSettingsComponent;
  readonly relativeScriptPath: string;
  readonly requireHandlerFactory: RequireHandlerFactory;
}

interface InvokeScriptPathParams {
  readonly app: App;
  readonly consoleDebugComponent: ConsoleDebugComponent;
  readonly relativeScriptPath: string;
}

export class InvokeScriptPathCommand {
  private readonly activeFileProvider: ActiveFileProvider;
  private readonly app: App;
  private readonly commandRegistrar: CommandRegistrar;
  private readonly consoleDebugComponent: ConsoleDebugComponent;
  private readonly menuEventRegistrar: MenuEventRegistrar;
  private readonly pluginName: string;
  private readonly pluginSettingsComponent: PluginSettingsComponent;
  private readonly relativeScriptPath: string;
  private readonly requireHandlerFactory: RequireHandlerFactory;
  public constructor(params: InvokeScriptPathCommandConstructorParams) {
    this.app = params.app;
    this.pluginSettingsComponent = params.pluginSettingsComponent;
    this.relativeScriptPath = params.relativeScriptPath;
    this.activeFileProvider = params.activeFileProvider;
    this.commandRegistrar = params.commandRegistrar;
    this.menuEventRegistrar = params.menuEventRegistrar;
    this.pluginName = params.pluginName;
    this.consoleDebugComponent = params.consoleDebugComponent;
    this.requireHandlerFactory = params.requireHandlerFactory;
  }

  public async register(): Promise<void> {
    let scriptOrCommand: Partial<ScriptOrCommand>;
    try {
      scriptOrCommand = await getScriptOrCommand({
        activeFileProvider: this.activeFileProvider,
        app: this.app,
        commandRegistrar: this.commandRegistrar,
        consoleDebugComponent: this.consoleDebugComponent,
        menuEventRegistrar: this.menuEventRegistrar,
        pluginName: this.pluginName,
        pluginSettingsComponent: this.pluginSettingsComponent,
        relativeScriptPath: this.relativeScriptPath,
        requireHandlerFactory: this.requireHandlerFactory
      });
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
      this.commandRegistrar.addCommand(invokeCommand);
      rebind(invokeCommand, 'checkCallback');
      relativeScriptPathCommandIdMap.set(this.relativeScriptPath, invokeCommand.id);
    } catch (error) {
      printError(new Error(`Error adding invokeCommand from ${this.relativeScriptPath}`, { cause: error }));
    }
  }

  private extractInvokeCommand(script: ScriptOrCommand): InvokeCommand {
    const baseInvokeCommand = {
      app: this.app,
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
              await script.invoke?.(this.app);
              this.consoleDebugComponent.debug(`${this.relativeScriptPath} invocable script executed successfully`);
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

export function invokeScriptPath(params: InvokeScriptPathParams): void {
  const { app, relativeScriptPath } = params;
  params.consoleDebugComponent.debug(`Invoking script: ${relativeScriptPath}.`);

  const commandId = relativeScriptPathCommandIdMap.get(relativeScriptPath);
  if (!commandId) {
    throw new Error(`No command registered for script path: ${relativeScriptPath}`);
  }
  const command = app.commands.findCommand(commandId);
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
      params.consoleDebugComponent.debug(`${relativeScriptPath} command executed successfully`);
    } catch (error) {
      printError(new Error(`Error invoking ${relativeScriptPath} command`, { cause: error }));
      new Notice(`Error invoking ${relativeScriptPath} command. See console for details.`);
    }
  } else if (command.callback) {
    try {
      command.callback();
      params.consoleDebugComponent.debug(`${relativeScriptPath} command executed successfully`);
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

async function getScriptOrCommand(params: GetScriptOrCommandParams): Promise<ScriptOrCommand> {
  const { app, pluginSettingsComponent, relativeScriptPath } = params;
  let vaultScriptPath = join(pluginSettingsComponent.settings.getInvocableScriptsFolder(), relativeScriptPath);
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
  return await params.requireHandlerFactory.requireVaultScriptAsync(vaultScriptPath) as Partial<ScriptOrCommand>;
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- We need T to get proper prop type.
function rebind<T extends keyof InvokeCommand>(invokeCommand: InvokeCommand, prop: T): void {
  if (typeof invokeCommand[prop] === 'function') {
    invokeCommand[prop] = invokeCommand[prop].bind(invokeCommand) as InvokeCommand[T];
  }
}
