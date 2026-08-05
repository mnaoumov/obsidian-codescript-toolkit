import type { ObsidianProtocolData } from 'obsidian';
import type { ConsoleDebugComponent } from 'obsidian-dev-utils/obsidian/components/console-debug-component';
import type { ObsidianProtocolHandlerRegistrar } from 'obsidian-dev-utils/obsidian/obsidian-protocol-handler-registrar';

import { toJson } from 'obsidian-dev-utils/object-utils';
import { ComponentEx } from 'obsidian-dev-utils/obsidian/components/component-ex';

import type { PluginSettingsComponent } from './plugin-settings-component.ts';
import type { RequireHandlerFactoryComponent } from './require-handlers/require-handler-factory.ts';

const PROTOCOL_HANDLER_ACTION = 'CodeScriptToolkit';

type GenericAsyncFunction = (...$arguments: unknown[]) => Promise<unknown>;

interface InvokeModuleFunctionParams {
  // eslint-disable-next-line unicorn/name-replacements -- `args` is an `obsidian-integration-testing` parameter name.
  readonly args: unknown[];
  readonly functionName: string;
  readonly moduleSpecifier: string;
}

interface ProtocolHandlerComponentConstructorParams {
  readonly consoleDebugComponent: ConsoleDebugComponent;
  readonly obsidianProtocolHandlerRegistrar: ObsidianProtocolHandlerRegistrar;
  readonly pluginSettingsComponent: PluginSettingsComponent;
  readonly RequireHandlerFactoryComponent: RequireHandlerFactoryComponent;
}

interface Query {
  // eslint-disable-next-line unicorn/name-replacements -- `args` is an `obsidian-integration-testing` parameter name.
  args?: string;
  code?: string;
  functionName?: string;
  module?: string;
}

interface WindowWithRequireAsync {
  requireAsync(id: string): Promise<Record<string, unknown>>;
}

export class ProtocolHandlerComponent extends ComponentEx {
  private readonly consoleDebugComponent: ConsoleDebugComponent;
  private readonly obsidianProtocolHandlerRegistrar: ObsidianProtocolHandlerRegistrar;
  private readonly pluginSettingsComponent: PluginSettingsComponent;
  private readonly RequireHandlerFactoryComponent: RequireHandlerFactoryComponent;

  public constructor(params: ProtocolHandlerComponentConstructorParams) {
    super();
    this.pluginSettingsComponent = params.pluginSettingsComponent;
    this.consoleDebugComponent = params.consoleDebugComponent;
    this.obsidianProtocolHandlerRegistrar = params.obsidianProtocolHandlerRegistrar;
    this.RequireHandlerFactoryComponent = params.RequireHandlerFactoryComponent;
  }

  public override onload(): void {
    this.obsidianProtocolHandlerRegistrar.registerObsidianProtocolHandler({
      action: PROTOCOL_HANDLER_ACTION,
      handler: this.processQuery.bind(this)
    });
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
      // eslint-disable-next-line unicorn/name-replacements -- `args` is an `obsidian-integration-testing` parameter name.
      parsedQuery.args ??= parsedQuery.functionName === 'invoke' ? 'app' : '';

      this.consoleDebugComponent.consoleDebug('Invoking script file from URL action:', {
        // eslint-disable-next-line unicorn/name-replacements -- `args` is an `obsidian-integration-testing` parameter name.
        args: parsedQuery.args,
        functionName: parsedQuery.functionName,
        module: parsedQuery.module
      });

      parsedQuery.code = `(${String(invokeModuleFunction)})({ args: [${parsedQuery.args}], functionName: '${parsedQuery.functionName}', moduleSpecifier: '${parsedQuery.module}' })`;
    } else {
      parsedQuery.code ??= '';

      this.consoleDebugComponent.consoleDebug('Invoking code from URL action:', {
        code: parsedQuery.code
      });
    }

    await this.RequireHandlerFactoryComponent.requireStringAsync({
      code: parsedQuery.code,
      path: 'dynamic-script-from-url-handler.ts'
    });
  }
}

/* v8 ignore start -- serialized via toString() and evaluated in another runtime context via requireStringAsync. */
async function invokeModuleFunction(params: InvokeModuleFunctionParams): Promise<void> {
  const { args, functionName, moduleSpecifier } = params;
  const windowWithRequireAsync = window as Partial<WindowWithRequireAsync>;
  const requireAsync = windowWithRequireAsync.requireAsync;
  if (typeof requireAsync !== 'function') {
    throw new TypeError('requireAsync is not defined in window.');
  }
  const module = await requireAsync(moduleSpecifier);
  const $function = module[functionName];
  if ($function === undefined) {
    throw new Error(`Function ${functionName} in module ${moduleSpecifier} is not defined.`);
  }
  if (typeof $function !== 'function') {
    throw new TypeError(`${functionName} in module ${moduleSpecifier} is not a function.`);
  }
  await ($function as GenericAsyncFunction)(...args);
}
/* v8 ignore stop */
