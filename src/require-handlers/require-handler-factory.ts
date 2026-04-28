import { Platform } from 'obsidian';
import { AsyncComponentBase } from 'obsidian-dev-utils/obsidian/components/async-component';
import { ensureNonNullable } from 'obsidian-dev-utils/type-guards';

import type { RequireOptions } from '../types.ts';
import type {
  RequireHandler,
  RequireHandlerConstructorParams,
  RequireStringAsyncParams
} from './require-handler.ts';

export class RequireHandlerFactory extends AsyncComponentBase implements RequireHandler {
  private _platformRequireHandler?: RequireHandler;

  private get platformRequireHandler(): RequireHandler {
    return ensureNonNullable(this._platformRequireHandler);
  }

  public constructor(private readonly params: RequireHandlerConstructorParams) {
    super();
  }

  public clearCache(): void {
    this.platformRequireHandler.clearCache();
  }

  public override async onload(): Promise<void> {
    await super.onload();

    // eslint-disable-next-line obsidianmd/prefer-active-doc -- We need main document.
    if (document.body.hasClass('emulate-mobile')) {
      // eslint-disable-next-line no-restricted-syntax -- We need dynamic import.
      this._platformRequireHandler = new (await import('./require-handler-emulate-mobile.ts')).RequireHandlerEmulateMobile(this.params);
    } else if (Platform.isMobile) {
      // eslint-disable-next-line no-restricted-syntax -- We need dynamic import.
      this._platformRequireHandler = new (await import('./require-handler-mobile.ts')).RequireHandlerMobile(this.params);
    } else {
      // eslint-disable-next-line no-restricted-syntax -- We need dynamic import.
      this._platformRequireHandler = new (await import('./require-handler-desktop.ts')).RequireHandlerDesktop(this.params);
    }

    this.addChild(this._platformRequireHandler);
  }

  public requireAsync(id: string, options?: Partial<RequireOptions>): Promise<unknown> {
    return this.platformRequireHandler.requireAsync(id, options);
  }

  public requireStringAsync(params: RequireStringAsyncParams): Promise<unknown> {
    return this.platformRequireHandler.requireStringAsync(params);
  }

  public requireVaultScriptAsync(id: string): Promise<unknown> {
    return this.platformRequireHandler.requireVaultScriptAsync(id);
  }
}
