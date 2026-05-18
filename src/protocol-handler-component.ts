import type { ObsidianProtocolData } from 'obsidian';
import type { ObsidianProtocolHandlerRegistrar } from 'obsidian-dev-utils/obsidian/obsidian-protocol-handler-registrar';
import type { ConsoleDebugComponent } from 'obsidian-dev-utils/obsidian/components/console-debug-component';

import { Component } from 'obsidian';
import { convertAsyncToSync } from 'obsidian-dev-utils/async';
import { toJson } from 'obsidian-dev-utils/object-utils';

import type { PluginSettingsComponent } from './plugin-settings-component.ts';
import type { RequireHandlerFactory } from './require-handlers/require-handler-factory.ts';

const PROTOCOL_HANDLER_ACTION = 'CodeScriptToolkit';

type GenericAsyncFn = (...args: unknown[]) => Promise<unknown>;

interface ProtocolHandlerComponentConstructorParams {
  readonly consoleDebugComponent: ConsoleDebugComponent;
  readonly obsidianProtocolHandlerRegistrar: ObsidianProtocolHandlerRegistrar;
  readonly pluginSettingsComponent: PluginSettingsComponent;
  readonly requireHandlerFactory: RequireHandlerFactory;
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
  private readonly consoleDebugComponent: ConsoleDebugComponent;
  private readonly obsidianProtocolHandlerRegistrar: ObsidianProtocolHandlerRegistrar;
  private readonly pluginSettingsComponent: PluginSettingsComponent;
  private readonly requireHandlerFactory: RequireHandlerFactory;

  public constructor(params: ProtocolHandlerComponentConstructorParams) {
    super();
    this.pluginSettingsComponent = params.pluginSettingsComponent;
    this.consoleDebugComponent = params.consoleDebugComponent;
    this.obsidianProtocolHandlerRegistrar = params.obsidianProtocolHandlerRegistrar;
    this.requireHandlerFactory = params.requireHandlerFactory;
  }

  // eslint-disable-next-line obsidian-dev-utils/require-super-call -- Base Component.onload is an empty virtual method.
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

    await this.requireHandlerFactory.requireStringAsync({
      code: parsedQuery.code,
      path: 'dynamic-script-from-url-handler.ts'
    });
  }
}

/* v8 ignore start -- serialized via toString() and evaluated in another runtime context via requireStringAsync. */
async function invokeModuleFn(moduleSpecifier: string, functionName: string, args: unknown[]): Promise<void> {
  const windowWithRequireAsync = window as Partial<WindowWithRequireAsync>;
  const requireAsync = windowWithRequireAsync.requireAsync;
  if (typeof requireAsync !== 'function') {
    throw new Error('requireAsync is not defined in window.');
  }
  const module = await requireAsync(moduleSpecifier);
  const fn = module[functionName];
  if (typeof fn === 'undefined') {
    throw new Error(`Function ${functionName} in module ${moduleSpecifier} is not defined.`);
  }
  if (typeof fn !== 'function') {
    throw new Error(`${functionName} in module ${moduleSpecifier} is not a function.`);
  }
  await (fn as GenericAsyncFn)(...args);
}
/* v8 ignore stop */
