import { GlobalCommandHandler } from 'obsidian-dev-utils/obsidian/command-handlers/global-command-handler';

import type { RequireHandlerFactoryComponent } from '../require-handlers/require-handler-factory.ts';

export class ClearCacheCommandHandler extends GlobalCommandHandler {
  public constructor(private readonly RequireHandlerFactoryComponent: RequireHandlerFactoryComponent) {
    super({
      icon: 'trash',
      id: 'clear-cache',
      name: 'Clear cache'
    });
  }

  public override execute(): void {
    this.RequireHandlerFactoryComponent.clearCache();
  }
}
