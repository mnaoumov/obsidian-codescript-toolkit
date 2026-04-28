import type { RequireHandlerFactory } from './require-handler-factory.ts';

import { VAULT_ROOT_PREFIX } from './require-handler.ts';

interface RequireStringAsyncParams {
  readonly path: string;
  readonly requireHandlerFactory: RequireHandlerFactory;
  readonly source: string;
  readonly urlSuffix?: string;
}

interface RequireVaultScriptAsyncParams {
  readonly id: string;
  readonly requireHandlerFactory: RequireHandlerFactory;
}

export async function requireStringAsync(params: RequireStringAsyncParams): Promise<unknown> {
  return params.requireHandlerFactory.requireStringAsync(params.source, params.path, params.urlSuffix);
}

export async function requireVaultScriptAsync(params: RequireVaultScriptAsyncParams): Promise<unknown> {
  return params.requireHandlerFactory.requireAsync(VAULT_ROOT_PREFIX + params.id);
}
