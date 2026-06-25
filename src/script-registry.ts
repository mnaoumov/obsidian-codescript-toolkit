import type {
  Command,
  IconName
} from 'obsidian';
import type { ActiveFileProvider } from 'obsidian-dev-utils/obsidian/active-file-provider';
import type { CommandRegistrar } from 'obsidian-dev-utils/obsidian/command-registrar';
import type { ConsoleDebugComponent } from 'obsidian-dev-utils/obsidian/components/console-debug-component';
import type { PluginNoticeComponent } from 'obsidian-dev-utils/obsidian/components/plugin-notice-component';
import type { MenuEventRegistrar } from 'obsidian-dev-utils/obsidian/menu-event-registrar';
import type { Promisable } from 'type-fest';

import { App } from 'obsidian';
import { printError } from 'obsidian-dev-utils/error';
import { noopAsync } from 'obsidian-dev-utils/function';
import { CommandHandler } from 'obsidian-dev-utils/obsidian/command-handlers/command-handler';
import { CommandHandlerComponent } from 'obsidian-dev-utils/obsidian/command-handlers/command-handler-component';
import { GlobalCommandHandler } from 'obsidian-dev-utils/obsidian/command-handlers/global-command-handler';
import { ComponentEx } from 'obsidian-dev-utils/obsidian/components/component-ex';
import { isMarkdownFile } from 'obsidian-dev-utils/obsidian/file-system';
import { join } from 'obsidian-dev-utils/path';
import { ensureNonNullable } from 'obsidian-dev-utils/type-guards';

import type { PluginSettingsComponent } from './plugin-settings-component.ts';
import type { RequireHandlerFactoryComponent } from './require-handlers/require-handler-factory.ts';
import type { Script } from './script.ts';

import { getCodeScriptToolkitNoteSettings } from './code-script-toolkit-note-settings.ts';

export const INVOKE_SCRIPT_FILE_COMMAND_NAME_PREFIX = 'invoke-script-file-';

interface CommandWrapperCommandHandlerConstructorParams {
  readonly app: App;
  readonly command: Partial<Command>;
  readonly consoleDebugComponent: ConsoleDebugComponent;
  readonly defaultCommandIcon: IconName;
  readonly defaultCommandId: string;
  readonly defaultName: string;
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

interface InvokeCommand extends Command {
  app: App;
}

interface ScriptComponentConstructorParams {
  readonly activeFileProvider: ActiveFileProvider;
  readonly app: App;
  readonly commandRegistrar: CommandRegistrar;
  readonly consoleDebugComponent: ConsoleDebugComponent;
  readonly menuEventRegistrar: MenuEventRegistrar;
  readonly pluginName: string;
  readonly pluginNoticeComponent: PluginNoticeComponent;
  readonly relativeScriptPath: string;
  readonly scriptOrCommand: Partial<ScriptOrCommand>;
}

interface ScriptOrCommand extends Partial<Script> {
  invokeCommand?: Partial<Command>;
}

interface ScriptRegistryComponentConstructorParams {
  readonly activeFileProvider: ActiveFileProvider;
  readonly app: App;
  readonly commandRegistrar: CommandRegistrar;
  readonly consoleDebugComponent: ConsoleDebugComponent;
  readonly menuEventRegistrar: MenuEventRegistrar;
  readonly pluginName: string;
  readonly pluginNoticeComponent: PluginNoticeComponent;
  readonly pluginSettingsComponent: PluginSettingsComponent;
  readonly RequireHandlerFactoryComponent: RequireHandlerFactoryComponent;
}

interface WrapperCommandHandler extends CommandHandler {
  forceInvoke(): Promise<void>;
}

class CommandWrapperCommandHandler extends CommandHandler implements WrapperCommandHandler {
  private readonly app: App;
  private readonly command: Partial<Command>;
  private readonly consoleDebugComponent: ConsoleDebugComponent;
  private readonly pluginNoticeComponent: PluginNoticeComponent;
  private readonly relativeScriptPath: string;

  public constructor(params: CommandWrapperCommandHandlerConstructorParams) {
    super({
      icon: params.command.icon ?? params.defaultCommandIcon,
      id: params.command.id ?? params.defaultCommandId,
      name: params.command.name ?? params.defaultName
    });
    this.app = params.app;
    this.command = params.command;
    this.relativeScriptPath = params.relativeScriptPath;
    this.consoleDebugComponent = params.consoleDebugComponent;
    this.pluginNoticeComponent = params.pluginNoticeComponent;
  }

  public override buildCommand(): Command {
    const invokeCommand: InvokeCommand = {
      app: this.app,
      icon: this.icon,
      id: this.id,
      name: this.name,
      ...this.command
    };
    rebind(invokeCommand, 'callback');
    rebind(invokeCommand, 'checkCallback');
    rebind(invokeCommand, 'editorCallback');
    rebind(invokeCommand, 'editorCheckCallback');
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
  private readonly activeFileProvider: ActiveFileProvider;
  private readonly app: App;
  private readonly commandRegistrar: CommandRegistrar;
  private readonly consoleDebugComponent: ConsoleDebugComponent;
  private readonly menuEventRegistrar: MenuEventRegistrar;
  private readonly pluginName: string;
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
    this.activeFileProvider = params.activeFileProvider;
    this.commandRegistrar = params.commandRegistrar;
    this.menuEventRegistrar = params.menuEventRegistrar;
    this.pluginName = params.pluginName;
    this.pluginNoticeComponent = params.pluginNoticeComponent;
  }

  public async forceInvoke(): Promise<void> {
    await this.wrapperCommandHandler.forceInvoke();
  }

  public override onload(): void {
    const DEFAULT_COMMAND_ICON: IconName = 'play';
    const DEFAULT_COMMAND_ID = `${INVOKE_SCRIPT_FILE_COMMAND_NAME_PREFIX}${this.relativeScriptPath}`;
    const DEFAULT_NAME = `Invoke script: ${this.relativeScriptPath}`;

    if (this.scriptOrCommand.invokeCommand) {
      this._wrapperCommandHandler = new CommandWrapperCommandHandler({
        app: this.app,
        command: this.scriptOrCommand.invokeCommand,
        consoleDebugComponent: this.consoleDebugComponent,
        defaultCommandIcon: DEFAULT_COMMAND_ICON,
        defaultCommandId: DEFAULT_COMMAND_ID,
        defaultName: DEFAULT_NAME,
        pluginNoticeComponent: this.pluginNoticeComponent,
        relativeScriptPath: this.relativeScriptPath
      });
    } else if (typeof this.scriptOrCommand.invoke === 'function') {
      this._wrapperCommandHandler = new FunctionWrapperCommandHandler({
        app: this.app,
        consoleDebugComponent: this.consoleDebugComponent,
        defaultCommandIcon: DEFAULT_COMMAND_ICON,
        defaultCommandId: DEFAULT_COMMAND_ID,
        defaultName: DEFAULT_NAME,
        invoke: this.scriptOrCommand.invoke.bind(this.scriptOrCommand),
        pluginNoticeComponent: this.pluginNoticeComponent,
        relativeScriptPath: this.relativeScriptPath
      });
    } else {
      throw new Error(`${this.relativeScriptPath} does not export invoke() function`);
    }

    const commandHandlerComponent = new CommandHandlerComponent({
      activeFileProvider: this.activeFileProvider,
      commandHandlers: [this.wrapperCommandHandler],
      commandRegistrar: this.commandRegistrar,
      menuEventRegistrar: this.menuEventRegistrar,
      pluginName: this.pluginName
    });

    this.addChild(commandHandlerComponent);
  }
}

export class ScriptRegistryComponent extends ComponentEx {
  private readonly activeFileProvider: ActiveFileProvider;
  private readonly app: App;
  private readonly commandRegistrar: CommandRegistrar;
  private readonly consoleDebugComponent: ConsoleDebugComponent;
  private readonly menuEventRegistrar: MenuEventRegistrar;
  private readonly pluginName: string;
  private readonly pluginNoticeComponent: PluginNoticeComponent;
  private readonly pluginSettingsComponent: PluginSettingsComponent;
  private readonly registeredWrapperCommandHandlerComponents = new Map<string, WrapperCommandHandlerComponent>();
  private readonly RequireHandlerFactoryComponent: RequireHandlerFactoryComponent;

  public constructor(params: ScriptRegistryComponentConstructorParams) {
    super();
    this.app = params.app;
    this.commandRegistrar = params.commandRegistrar;
    this.consoleDebugComponent = params.consoleDebugComponent;
    this.activeFileProvider = params.activeFileProvider;
    this.menuEventRegistrar = params.menuEventRegistrar;
    this.pluginName = params.pluginName;
    this.pluginNoticeComponent = params.pluginNoticeComponent;
    this.pluginSettingsComponent = params.pluginSettingsComponent;
    this.RequireHandlerFactoryComponent = params.RequireHandlerFactoryComponent;
  }

  public async getScriptOrCommand(relativeScriptPath: string): Promise<ScriptOrCommand> {
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
      activeFileProvider: this.activeFileProvider,
      app: this.app,
      commandRegistrar: this.commandRegistrar,
      consoleDebugComponent: this.consoleDebugComponent,
      menuEventRegistrar: this.menuEventRegistrar,
      pluginName: this.pluginName,
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
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- We need T to get proper prop type.
function rebind<T extends keyof InvokeCommand>(invokeCommand: InvokeCommand, prop: T): void {
  if (typeof invokeCommand[prop] === 'function') {
    invokeCommand[prop] = invokeCommand[prop].bind(invokeCommand) as InvokeCommand[T];
  }
}
