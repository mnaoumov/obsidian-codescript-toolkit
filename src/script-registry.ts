import type {
  Command,
  IconName
} from 'obsidian';
import type { CommandHandlerComponent } from 'obsidian-dev-utils/obsidian/command-handlers/command-handler-component';
import type { ConsoleDebugComponent } from 'obsidian-dev-utils/obsidian/components/console-debug-component';
import type { PluginNoticeComponent } from 'obsidian-dev-utils/obsidian/components/plugin-notice-component';
import type { Promisable } from 'type-fest';

import { App } from 'obsidian';
import {
  ErrorWrapper,
  printError
} from 'obsidian-dev-utils/error';
import { noopAsync } from 'obsidian-dev-utils/function';
import { CommandHandler } from 'obsidian-dev-utils/obsidian/command-handlers/command-handler';
import { GlobalCommandHandler } from 'obsidian-dev-utils/obsidian/command-handlers/global-command-handler';
import { ComponentEx } from 'obsidian-dev-utils/obsidian/components/component-ex';
import { isMarkdownFile } from 'obsidian-dev-utils/obsidian/file-system';
import { join } from 'obsidian-dev-utils/path';
import { ensureNonNullable } from 'obsidian-dev-utils/type-guards';

import type { PluginSettingsComponent } from './plugin-settings-component.ts';
import type { RequireHandlerFactoryComponent } from './require-handlers/require-handler-factory.ts';
import type { Script } from './script.ts';

import { getCodeScriptToolkitNoteSettings } from './code-script-toolkit-note-settings.ts';

const INVOKE_SCRIPT_FILE_COMMAND_NAME_PREFIX = 'invoke-script-file-';

interface CommandWrapperCommandHandlerConstructorParams {
  readonly command: Partial<Command>;
  readonly consoleDebugComponent: ConsoleDebugComponent;
  readonly defaultCommandIcon: IconName;
  readonly defaultCommandId: string;
  readonly defaultCommandName: string;
  readonly pluginNoticeComponent: PluginNoticeComponent;
  readonly relativeScriptPath: string;
}

interface FunctionWrapperCommandHandlerConstructorParams {
  readonly app: App;
  readonly consoleDebugComponent: ConsoleDebugComponent;
  readonly defaultCommandIcon: IconName;
  readonly defaultCommandId: string;
  readonly defaultName: string;
  invoke(this: void, app: App): Promisable<void>;
  readonly pluginNoticeComponent: PluginNoticeComponent;
  readonly relativeScriptPath: string;
}

interface ScriptComponentConstructorParams {
  readonly app: App;
  readonly commandHandlerComponent: CommandHandlerComponent;
  readonly consoleDebugComponent: ConsoleDebugComponent;
  readonly pluginNoticeComponent: PluginNoticeComponent;
  readonly relativeScriptPath: string;
  readonly scriptOrCommand: Partial<ScriptOrCommand>;
}

interface ScriptOrCommand extends Partial<Script> {
  buildInvokeCommand?(app: App): Promisable<Partial<Command>>;
  // Deprecated for script authors, who should export `buildInvokeCommand()` instead. Declared here only so legacy
  // Scripts still exporting it can be detected and reported. Not a `@deprecated` tag: this interface is module-private,
  // So the tag would reach no consumer while making its own detection below fail `@typescript-eslint/no-deprecated`.
  invokeCommand?: Partial<Command>;
}

interface ScriptRegistryComponentConstructorParams {
  readonly app: App;
  readonly commandHandlerComponent: CommandHandlerComponent;
  readonly consoleDebugComponent: ConsoleDebugComponent;
  readonly pluginNoticeComponent: PluginNoticeComponent;
  readonly pluginSettingsComponent: PluginSettingsComponent;
  readonly RequireHandlerFactoryComponent: RequireHandlerFactoryComponent;
}

interface WrapperCommandHandler extends CommandHandler {
  forceInvoke(): Promise<void>;
}

class CommandWrapperCommandHandler extends CommandHandler implements WrapperCommandHandler {
  private readonly command: Partial<Command>;
  private readonly consoleDebugComponent: ConsoleDebugComponent;
  private readonly pluginNoticeComponent: PluginNoticeComponent;
  private readonly relativeScriptPath: string;

  public constructor(params: CommandWrapperCommandHandlerConstructorParams) {
    super({
      icon: params.command.icon ?? params.defaultCommandIcon,
      id: params.command.id ?? params.defaultCommandId,
      name: params.command.name ?? params.defaultCommandName
    });
    this.command = params.command;
    this.relativeScriptPath = params.relativeScriptPath;
    this.consoleDebugComponent = params.consoleDebugComponent;
    this.pluginNoticeComponent = params.pluginNoticeComponent;
  }

  public override buildCommand(): Command {
    const invokeCommand: Command = {
      icon: this.icon,
      id: this.id,
      name: this.name,
      ...this.command
    };
    return invokeCommand;
  }

  public async forceInvoke(): Promise<void> {
    await noopAsync();
    const command = this.buildCommand();

    if (command.checkCallback) {
      try {
        if (!command.checkCallback(true)) {
          this.pluginNoticeComponent.showNotice(`${this.relativeScriptPath} command check condition not met`);
          return;
        }
      } catch (error) {
        printError(new Error(`Error checking ${this.relativeScriptPath} command check condition`, { cause: error }));
        this.pluginNoticeComponent.showNotice(`Error checking ${this.relativeScriptPath} command check condition. See console for details.`);
        return;
      }

      try {
        command.checkCallback(false);
        this.consoleDebugComponent.consoleDebug(`${this.relativeScriptPath} command executed successfully`);
      } catch (error) {
        printError(new Error(`Error invoking ${this.relativeScriptPath} command`, { cause: error }));
        this.pluginNoticeComponent.showNotice(`Error invoking ${this.relativeScriptPath} command. See console for details.`);
      }
    } else if (command.callback) {
      try {
        command.callback();
        this.consoleDebugComponent.consoleDebug(`${this.relativeScriptPath} command executed successfully`);
      } catch (error) {
        printError(new Error(`Error invoking ${this.relativeScriptPath} command`, { cause: error }));
        this.pluginNoticeComponent.showNotice(`Error invoking ${this.relativeScriptPath} command. See console for details.`);
      }
    }
  }
}

class FunctionWrapperCommandHandler extends GlobalCommandHandler implements WrapperCommandHandler {
  private readonly app: App;
  private readonly consoleDebugComponent: ConsoleDebugComponent;
  private readonly invoke: (app: App) => Promisable<void>;
  private readonly pluginNoticeComponent: PluginNoticeComponent;
  private readonly relativeScriptPath: string;

  public constructor(params: FunctionWrapperCommandHandlerConstructorParams) {
    super({
      icon: params.defaultCommandIcon,
      id: params.defaultCommandId,
      name: params.defaultName
    });
    this.app = params.app;
    this.invoke = params.invoke;
    this.relativeScriptPath = params.relativeScriptPath;
    this.consoleDebugComponent = params.consoleDebugComponent;
    this.pluginNoticeComponent = params.pluginNoticeComponent;
  }

  public async forceInvoke(): Promise<void> {
    await this.execute();
  }

  protected override async execute(): Promise<void> {
    try {
      await this.invoke(this.app);
      this.consoleDebugComponent.consoleDebug(`${this.relativeScriptPath} invocable script executed successfully`);
    } catch (error) {
      printError(new Error(`Error invoking ${this.relativeScriptPath}`, { cause: error }));
      this.pluginNoticeComponent.showNotice(`Error invoking ${this.relativeScriptPath}. See console for details.`);
    }
  }
}

class WrapperCommandHandlerComponent extends ComponentEx {
  private _wrapperCommandHandler?: WrapperCommandHandler;
  private readonly app: App;
  private readonly commandHandlerComponent: CommandHandlerComponent;
  private readonly consoleDebugComponent: ConsoleDebugComponent;
  private readonly pluginNoticeComponent: PluginNoticeComponent;
  private readonly relativeScriptPath: string;
  private readonly scriptOrCommand: Partial<ScriptOrCommand>;

  private get wrapperCommandHandler(): WrapperCommandHandler {
    return ensureNonNullable(this._wrapperCommandHandler);
  }

  public constructor(params: ScriptComponentConstructorParams) {
    super();
    this.scriptOrCommand = params.scriptOrCommand;
    this.relativeScriptPath = params.relativeScriptPath;
    this.app = params.app;
    this.consoleDebugComponent = params.consoleDebugComponent;
    this.commandHandlerComponent = params.commandHandlerComponent;
    this.pluginNoticeComponent = params.pluginNoticeComponent;
  }

  public async forceInvoke(): Promise<void> {
    await this.wrapperCommandHandler.forceInvoke();
  }

  public override async onloadAsync(): Promise<void> {
    const DEFAULT_COMMAND_ICON: IconName = 'play';
    const DEFAULT_COMMAND_ID = `${INVOKE_SCRIPT_FILE_COMMAND_NAME_PREFIX}${this.relativeScriptPath}`;
    const DEFAULT_COMMAND_NAME = `Invoke script: ${this.relativeScriptPath}`;

    if (this.scriptOrCommand.invokeCommand) {
      this._wrapperCommandHandler = new CommandWrapperCommandHandler({
        command: this.createFailingInvokeCommand(new Error(`${this.relativeScriptPath} exports deprecated \`invokeCommand\`. Rewrite it to use \`buildInvokeCommand()\` instead.`)),
        consoleDebugComponent: this.consoleDebugComponent,
        defaultCommandIcon: DEFAULT_COMMAND_ICON,
        defaultCommandId: DEFAULT_COMMAND_ID,
        defaultCommandName: DEFAULT_COMMAND_NAME,
        pluginNoticeComponent: this.pluginNoticeComponent,
        relativeScriptPath: this.relativeScriptPath
      });
    } else if (this.scriptOrCommand.buildInvokeCommand) {
      let invokeCommand: Partial<Command>;
      try {
        invokeCommand = await this.scriptOrCommand.buildInvokeCommand(this.app);
      } catch (error) {
        invokeCommand = this.createFailingInvokeCommand(ErrorWrapper.create(error));
      }
      this._wrapperCommandHandler = new CommandWrapperCommandHandler({
        command: invokeCommand,
        consoleDebugComponent: this.consoleDebugComponent,
        defaultCommandIcon: DEFAULT_COMMAND_ICON,
        defaultCommandId: DEFAULT_COMMAND_ID,
        defaultCommandName: DEFAULT_COMMAND_NAME,
        pluginNoticeComponent: this.pluginNoticeComponent,
        relativeScriptPath: this.relativeScriptPath
      });
    } else if (typeof this.scriptOrCommand.invoke === 'function') {
      this._wrapperCommandHandler = new FunctionWrapperCommandHandler({
        app: this.app,
        consoleDebugComponent: this.consoleDebugComponent,
        defaultCommandIcon: DEFAULT_COMMAND_ICON,
        defaultCommandId: DEFAULT_COMMAND_ID,
        defaultName: DEFAULT_COMMAND_NAME,
        invoke: this.scriptOrCommand.invoke.bind(this.scriptOrCommand),
        pluginNoticeComponent: this.pluginNoticeComponent,
        relativeScriptPath: this.relativeScriptPath
      });
    } else {
      this._wrapperCommandHandler = new CommandWrapperCommandHandler({
        command: this.createFailingInvokeCommand(new Error(`${this.relativeScriptPath} does not export \`invoke()\` or \`buildInvokeCommand()\` functions`)),
        consoleDebugComponent: this.consoleDebugComponent,
        defaultCommandIcon: DEFAULT_COMMAND_ICON,
        defaultCommandId: DEFAULT_COMMAND_ID,
        defaultCommandName: DEFAULT_COMMAND_NAME,
        pluginNoticeComponent: this.pluginNoticeComponent,
        relativeScriptPath: this.relativeScriptPath
      });
    }

    const disposable = this.commandHandlerComponent.registerCommandHandlers([this.wrapperCommandHandler]);
    this.registerDisposable(disposable);
  }

  private createFailingInvokeCommand(error: Error): Partial<Command> {
    const buildError = new Error(`Error building invoke command for ${this.relativeScriptPath}`, { cause: error });
    printError(buildError);
    const noticeMessage = `${buildError.message}. See console for details.`;
    this.pluginNoticeComponent.showNotice(noticeMessage);
    return {
      checkCallback: (checking: boolean): boolean => {
        if (!checking) {
          this.pluginNoticeComponent.showNotice(noticeMessage);
        }
        printError(buildError);
        return true;
      }
    };
  }
}

export class ScriptRegistryComponent extends ComponentEx {
  private readonly app: App;
  private readonly commandHandlerComponent: CommandHandlerComponent;
  private readonly consoleDebugComponent: ConsoleDebugComponent;
  private readonly pluginNoticeComponent: PluginNoticeComponent;
  private readonly pluginSettingsComponent: PluginSettingsComponent;
  private readonly registeredWrapperCommandHandlerComponents = new Map<string, WrapperCommandHandlerComponent>();
  private readonly RequireHandlerFactoryComponent: RequireHandlerFactoryComponent;

  public constructor(params: ScriptRegistryComponentConstructorParams) {
    super();
    this.app = params.app;
    this.commandHandlerComponent = params.commandHandlerComponent;
    this.consoleDebugComponent = params.consoleDebugComponent;
    this.pluginNoticeComponent = params.pluginNoticeComponent;
    this.pluginSettingsComponent = params.pluginSettingsComponent;
    this.RequireHandlerFactoryComponent = params.RequireHandlerFactoryComponent;
  }

  public async invokeScriptPath(relativeScriptPath: string): Promise<void> {
    this.consoleDebugComponent.consoleDebug(`Invoking script: ${relativeScriptPath}.`);

    const commandHandlerComponent = this.registeredWrapperCommandHandlerComponents.get(relativeScriptPath);
    if (!commandHandlerComponent) {
      throw new Error(`No command registered for script path: ${relativeScriptPath}`);
    }

    await commandHandlerComponent.forceInvoke();
  }

  public async registerScript(relativeScriptPath: string): Promise<void> {
    let scriptOrCommand: Partial<ScriptOrCommand>;
    try {
      scriptOrCommand = await this.getScriptOrCommand(relativeScriptPath);
    } catch (error) {
      printError(new Error(`Error requiring script: ${relativeScriptPath}`, { cause: error }));
      return;
    }

    const wrapperCommandHandlerComponent = new WrapperCommandHandlerComponent({
      app: this.app,
      commandHandlerComponent: this.commandHandlerComponent,
      consoleDebugComponent: this.consoleDebugComponent,
      pluginNoticeComponent: this.pluginNoticeComponent,
      relativeScriptPath,
      scriptOrCommand
    });

    this.registeredWrapperCommandHandlerComponents.set(relativeScriptPath, wrapperCommandHandlerComponent);
    this.addChild(wrapperCommandHandlerComponent);
  }

  public unregisterInvocableCommands(): void {
    for (const commandHandlerComponent of this.registeredWrapperCommandHandlerComponents.values()) {
      this.removeChild(commandHandlerComponent);
    }
    this.registeredWrapperCommandHandlerComponents.clear();
  }

  private async getScriptOrCommand(relativeScriptPath: string): Promise<ScriptOrCommand> {
    let vaultScriptPath = join(this.pluginSettingsComponent.settings.getInvocableScriptsFolder(), relativeScriptPath);
    if (!(await this.app.vault.adapter.exists(vaultScriptPath))) {
      throw new Error(`Script not found: '${relativeScriptPath}'.`);
    }

    if (isMarkdownFile(vaultScriptPath)) {
      const settings = await getCodeScriptToolkitNoteSettings(this.app, vaultScriptPath);
      if (!settings.isInvocable) {
        throw new Error(`Script is not invocable: '${relativeScriptPath}'.`);
      }
      if (settings.invocableCodeScriptName) {
        vaultScriptPath += `?codeScriptName=${settings.invocableCodeScriptName}`;
      }
    }
    return await this.RequireHandlerFactoryComponent.requireVaultScriptAsync(vaultScriptPath) as Partial<ScriptOrCommand>;
  }
}
