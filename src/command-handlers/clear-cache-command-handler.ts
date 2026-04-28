import { GlobalCommandHandler } from 'obsidian-dev-utils/obsidian/command-handlers/global-command-handler';

import type { RequireHandlerFactory } from '../require-handlers/require-handler-factory.ts';

export class ClearCacheCommandHandler extends GlobalCommandHandler {
  public constructor(private readonly requireHandlerFactory: RequireHandlerFactory) {
    super({
      icon: 'trash',
      id: 'clear-cache',
      name: 'Clear cache'
    });
  }

  public override execute(): void {
    this.requireHandlerFactory.clearCache();
  }
}
