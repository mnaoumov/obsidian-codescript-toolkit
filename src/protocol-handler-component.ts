import type {
  App,
  ObsidianProtocolData
} from 'obsidian';
import type { ActiveFileProvider } from 'obsidian-dev-utils/obsidian/active-file-provider';
import type { CommandRegistrar } from 'obsidian-dev-utils/obsidian/command-registrar';
import type { MenuEventRegistrar } from 'obsidian-dev-utils/obsidian/menu-event-registrar';
import type { ObsidianProtocolHandlerRegistrar } from 'obsidian-dev-utils/obsidian/obsidian-protocol-handler-registrar';
import type { ConsoleDebugComponent } from 'obsidian-dev-utils/obsidian/plugin/components/console-debug-component';

import { Component } from 'obsidian';
import { convertAsyncToSync } from 'obsidian-dev-utils/async';
import { toJson } from 'obsidian-dev-utils/object-utils';
import { ensureNonNullable } from 'obsidian-dev-utils/type-guards';

import type { PluginSettingsComponent } from './plugin-settings-component.ts';

import { requireStringAsync } from './require-handlers/require-handler-utils.ts';

const PROTOCOL_HANDLER_ACTION = 'CodeScriptToolkit';

type GenericAsyncFn = (...args: unknown[]) => Promise<unknown>;

interface ProtocolHandlerComponentConstructorParams {
  activeFileProvider: ActiveFileProvider;
  app: App;
  commandRegistrar: CommandRegistrar;
  consoleDebugComponent: ConsoleDebugComponent;
  menuEventRegistrar: MenuEventRegistrar;
  obsidianProtocolHandlerRegistrar: ObsidianProtocolHandlerRegistrar;
  pluginName: string;
  pluginSettingsComponent: PluginSettingsComponent;
}

interface Query {
  args?: string;
  code?: string;
  functionName?: string;
  module?: string;
}

interface WindowWithRequireAsync {
  requireAsync: (id: string) => Promise<Record<string, unknown>>;
}

export class ProtocolHandlerComponent extends Component {
  private readonly activeFileProvider: ActiveFileProvider;
  private readonly app: App;
  private readonly commandRegistrar: CommandRegistrar;
  private readonly consoleDebugComponent: ConsoleDebugComponent;
  private readonly menuEventRegistrar: MenuEventRegistrar;
  private readonly obsidianProtocolHandlerRegistrar: ObsidianProtocolHandlerRegistrar;
  private readonly pluginName: string;
  private readonly pluginSettingsComponent: PluginSettingsComponent;

  public constructor(params: ProtocolHandlerComponentConstructorParams) {
    super();
    this.app = params.app;
    this.pluginSettingsComponent = params.pluginSettingsComponent;
    this.activeFileProvider = params.activeFileProvider;
    this.commandRegistrar = params.commandRegistrar;
    this.menuEventRegistrar = params.menuEventRegistrar;
    this.pluginName = params.pluginName;
    this.consoleDebugComponent = params.consoleDebugComponent;
    this.obsidianProtocolHandlerRegistrar = params.obsidianProtocolHandlerRegistrar;
  }

  public override onload(): void {
    this.obsidianProtocolHandlerRegistrar.registerObsidianProtocolHandler(PROTOCOL_HANDLER_ACTION, convertAsyncToSync(this.processQuery.bind(this)));
  }

  private async processQuery(query: ObsidianProtocolData): Promise<void> {
    if (!this.pluginSettingsComponent.settings.shouldHandleProtocolUrls) {
      console.warn('Handling of protocol URLs is disabled in plugin settings.');
      return;
    }

    const parsedQuery = query as Partial<Query>;

    if (!parsedQuery.module && !parsedQuery.code) {
      throw new Error(`URL provided neither module nor code parameters: ${toJson(query)}`);
    }

    if (parsedQuery.module && parsedQuery.code) {
      throw new Error(`URL provided both module and code parameters: ${toJson(query)}'`);
    }

    if (parsedQuery.module) {
      parsedQuery.functionName ??= 'invoke';
      parsedQuery.args ??= parsedQuery.functionName === 'invoke' ? 'app' : '';

      this.consoleDebugComponent.debug('Invoking script file from URL action:', {
        args: parsedQuery.args,
        functionName: parsedQuery.functionName,
        module: parsedQuery.module
      });

      parsedQuery.code = `(${String(invokeModuleFn)})('${parsedQuery.module}', '${parsedQuery.functionName}', [${parsedQuery.args}])`;
    } else {
      parsedQuery.code ??= '';

      this.consoleDebugComponent.debug('Invoking code from URL action:', {
        code: parsedQuery.code
      });
    }

    await requireStringAsync({
      activeFileProvider: this.activeFileProvider,
      app: this.app,
      commandRegistrar: this.commandRegistrar,
      consoleDebugComponent: this.consoleDebugComponent,
      menuEventRegistrar: this.menuEventRegistrar,
      path: 'dynamic-script-from-url-handler.ts',
      pluginName: this.pluginName,
      pluginSettingsComponent: this.pluginSettingsComponent,
      source: parsedQuery.code
    });
  }
}

async function invokeModuleFn(moduleSpecifier: string, functionName: string, args: unknown[]): Promise<void> {
  const windowWithRequireAsync = window as Partial<WindowWithRequireAsync>;
  const module = await ensureNonNullable(windowWithRequireAsync.requireAsync)(moduleSpecifier);
  const fn = module[functionName];
  if (typeof fn === 'undefined') {
    throw new Error(`Function ${functionName} in module ${moduleSpecifier} is not defined.`);
  }
  if (typeof fn !== 'function') {
    throw new Error(`${functionName} in module ${moduleSpecifier} is not a function.`);
  }
  await (fn as GenericAsyncFn)(...args);
}
