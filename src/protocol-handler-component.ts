import type {
  App,
  ObsidianProtocolData
} from 'obsidian';

import { Component } from 'obsidian';
import { convertAsyncToSync } from 'obsidian-dev-utils/async';
import { toJson } from 'obsidian-dev-utils/object-utils';
import { ensureNonNullable } from 'obsidian-dev-utils/type-guards';

import type { CodeScriptToolkitComponent } from './code-script-toolkit-component.ts';
import type { PluginSettingsComponent } from './plugin-settings-component.ts';

import { requireStringAsync } from './require-handler-utils.ts';

const PROTOCOL_HANDLER_ACTION = 'CodeScriptToolkit';

type GenericAsyncFn = (...args: unknown[]) => Promise<unknown>;

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
  public constructor(
    private readonly plugin: CodeScriptToolkitComponent,
    private readonly pluginSettingsComponent: PluginSettingsComponent,
    private readonly app: App
  ) {
    super();
  }

  public override onload(): void {
    this.plugin.registerObsidianProtocolHandler(PROTOCOL_HANDLER_ACTION, convertAsyncToSync(this.processQuery.bind(this)));
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

      this.plugin.consoleDebug('Invoking script file from URL action:', {
        args: parsedQuery.args,
        functionName: parsedQuery.functionName,
        module: parsedQuery.module
      });

      parsedQuery.code = `(${String(invokeModuleFn)})('${parsedQuery.module}', '${parsedQuery.functionName}', [${parsedQuery.args}])`;
    } else {
      parsedQuery.code ??= '';

      this.plugin.consoleDebug('Invoking code from URL action:', {
        code: parsedQuery.code
      });
    }

    await requireStringAsync(this.app, this.pluginSettingsComponent, parsedQuery.code, 'dynamic-script-from-url-handler.ts');
  }
}

async function invokeModuleFn(moduleSpecifier: string, functionName: string, args: unknown[]): Promise<void> {
  // eslint-disable-next-line obsidianmd/prefer-active-doc -- We need main window.
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
