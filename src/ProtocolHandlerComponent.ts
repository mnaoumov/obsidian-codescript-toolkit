import type { ObsidianProtocolData } from 'obsidian';

import { Component } from 'obsidian';
import { convertAsyncToSync } from 'obsidian-dev-utils/Async';
import { toJson } from 'obsidian-dev-utils/ObjectUtils';

import type { Plugin } from './Plugin.ts';

import { requireStringAsync } from './RequireHandlerUtils.ts';

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
  public constructor(private readonly plugin: Plugin) {
    super();
  }

  public override onload(): void {
    this.plugin.registerObsidianProtocolHandler(PROTOCOL_HANDLER_ACTION, convertAsyncToSync(this.processQuery.bind(this)));
  }

  private async processQuery(query: ObsidianProtocolData): Promise<void> {
    if (!this.plugin.settings.shouldHandleProtocolUrls) {
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

      parsedQuery.code = `(${invokeModuleFn.toString()})('${parsedQuery.module}', '${parsedQuery.functionName}', [${parsedQuery.args}])`;
    } else {
      parsedQuery.code ??= '';

      this.plugin.consoleDebug('Invoking code from URL action:', {
        code: parsedQuery.code
      });
    }

    await requireStringAsync(parsedQuery.code, 'dynamic-script-from-url-handler.ts');
  }
}

async function invokeModuleFn(moduleSpecifier: string, functionName: string, args: unknown[]): Promise<void> {
  const windowWithRequireAsync = window as unknown as WindowWithRequireAsync;
  const module = await windowWithRequireAsync.requireAsync(moduleSpecifier);
  const fn = module[functionName];
  if (typeof fn === 'undefined') {
    throw new Error(`Function ${functionName} in module ${moduleSpecifier} is not defined.`);
  }
  if (typeof fn !== 'function') {
    throw new Error(`${functionName} in module ${moduleSpecifier} is not a function.`);
  }
  await (fn as GenericAsyncFn)(...args);
}
