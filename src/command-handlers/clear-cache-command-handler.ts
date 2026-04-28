import { GlobalCommandHandler } from 'obsidian-dev-utils/obsidian/command-handlers/global-command-handler';

import type { RequireHandlerFactory } from '../require-handlers/require-handler-factory.ts';

interface ClearCacheCommandHandlerConstructorParams {
  readonly pluginName: string;
  readonly requireHandlerFactory: RequireHandlerFactory;
}

export class ClearCacheCommandHandler extends GlobalCommandHandler {
  private readonly requireHandlerFactory: RequireHandlerFactory;

  public constructor(params: ClearCacheCommandHandlerConstructorParams) {
    super({
      icon: 'trash',
      id: 'clear-cache',
      name: 'Clear cache'
    });
    this.requireHandlerFactory = params.requireHandlerFactory;
  }

  public override execute(): void {
    this.requireHandlerFactory.platformRequireHandler.clearCache();
  }
}
