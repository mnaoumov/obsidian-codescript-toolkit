import type { ConsoleDebugComponent } from '@mnaoumov/obsidian-lib/components/console-debug-component';
import type {
  App,
  ObsidianProtocolData
} from 'obsidian';

import { ComponentEx } from '@mnaoumov/obsidian-lib/components/component-ex';
import { toJson } from '@mnaoumov/typescript-lib/object-utils';

import type { RequireHandlerFactoryComponent } from './require-handlers/require-handler-factory.ts';
import type { PluginSettingsComponent } from './settings/plugin-settings-component.ts';

const PROTOCOL_HANDLER_ACTION = 'CodeScriptToolkit';

type GenericAsyncFunction = (...$arguments: unknown[]) => Promise<unknown>;

interface InvokeModuleFunctionParams {
  // eslint-disable-next-line unicorn/name-replacements -- `args` is the public `obsidian://CodeScriptToolkit?args=` query key.
  readonly args: unknown[];
  readonly functionName: string;
  readonly moduleSpecifier: string;
}

interface ProtocolHandlerComponentConstructorParams {
  readonly app: App;
  readonly consoleDebugComponent: ConsoleDebugComponent;
  readonly pluginSettingsComponent: PluginSettingsComponent;
  readonly RequireHandlerFactoryComponent: RequireHandlerFactoryComponent;
}

interface Query {
  // eslint-disable-next-line unicorn/name-replacements, typescript-dev-toolkit/readonly-interface-members -- `args` is the public `obsidian://CodeScriptToolkit?args=` query key. Protocol query processing fills in default arguments before invoking the script.
  args?: string;
  // eslint-disable-next-line typescript-dev-toolkit/readonly-interface-members -- Protocol query processing generates or defaults the executable code.
  code?: string;
  // eslint-disable-next-line typescript-dev-toolkit/readonly-interface-members -- Protocol query processing fills in the default function name.
  functionName?: string;
  readonly module?: string;
}

interface WindowWithRequireAsync {
  readonly requireAsync: (id: string) => Promise<Record<string, unknown>>;
}

export class ProtocolHandlerComponent extends ComponentEx {
  private readonly app: App;
  private readonly consoleDebugComponent: ConsoleDebugComponent;
  private readonly pluginSettingsComponent: PluginSettingsComponent;
  private readonly RequireHandlerFactoryComponent: RequireHandlerFactoryComponent;

  public constructor(params: ProtocolHandlerComponentConstructorParams) {
    super();
    this.app = params.app;
    this.pluginSettingsComponent = params.pluginSettingsComponent;
    this.consoleDebugComponent = params.consoleDebugComponent;
    this.RequireHandlerFactoryComponent = params.RequireHandlerFactoryComponent;
  }

  public override onload(): void {
    // `Plugin.registerObsidianProtocolHandler` ties the unregister to the plugin's own `_events`, which `Component.unload` runs only
    // after every child unloaded without throwing. So a plugin instance whose unload threw leaves its handler behind, and the next
    // instance's registration throws `Action "CodeScriptToolkit" is already registered as a handler.`, failing the whole plugin load.
    // Registering against this component's lifetime, after dropping such a leftover, makes the registration idempotent.
    const workspace = this.app.workspace;
    const staleHandler = workspace.protocolHandler.handlers.get(PROTOCOL_HANDLER_ACTION);
    if (staleHandler) {
      console.warn(`Replacing the stale "${PROTOCOL_HANDLER_ACTION}" protocol handler left behind by a previous plugin instance.`);
      workspace.unregisterObsidianProtocolHandler(PROTOCOL_HANDLER_ACTION, staleHandler);
    }

    const handler = this.processQuery.bind(this);
    workspace.registerObsidianProtocolHandler(PROTOCOL_HANDLER_ACTION, handler);
    this.register(() => {
      workspace.unregisterObsidianProtocolHandler(PROTOCOL_HANDLER_ACTION, handler);
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
      // eslint-disable-next-line unicorn/name-replacements -- `args` is the public `obsidian://CodeScriptToolkit?args=` query key.
      parsedQuery.args ??= parsedQuery.functionName === 'invoke' ? 'app' : '';

      this.consoleDebugComponent.consoleDebug('Invoking script file from URL action:', {
        // eslint-disable-next-line unicorn/name-replacements -- `args` is the public `obsidian://CodeScriptToolkit?args=` query key.
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
  const $module = await requireAsync(moduleSpecifier);
  const $function = $module[functionName];
  if ($function === undefined) {
    throw new Error(`Function ${functionName} in module ${moduleSpecifier} is not defined.`);
  }
  if (typeof $function !== 'function') {
    throw new TypeError(`${functionName} in module ${moduleSpecifier} is not a function.`);
  }
  await ($function as GenericAsyncFunction)(...args);
}
/* v8 ignore stop */
