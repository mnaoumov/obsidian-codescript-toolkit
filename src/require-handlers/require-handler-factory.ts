import { Platform } from 'obsidian';
import { ComponentEx } from 'obsidian-dev-utils/obsidian/components/component-ex';
import { ensureNonNullable } from 'obsidian-dev-utils/type-guards';

import type { RequireOptions } from '../types.ts';
import type {
  RequireHandler,
  RequireHandlerConstructorParams,
  RequireStringAsyncParams
} from './require-handler.ts';

type RequireHandlerFactoryComponentRequireStringAsyncParams = RequireStringAsyncParams;

export class RequireHandlerFactoryComponent extends ComponentEx implements RequireHandler {
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

  public override async onloadAsync(): Promise<void> {
    await super.onloadAsync();

    if (document.body.hasClass('emulate-mobile')) {
      const emulateMobileModule = await import('./require-handler-emulate-mobile.ts');
      this._platformRequireHandler = new emulateMobileModule.RequireHandlerEmulateMobileComponent(this.params);
    } else if (Platform.isMobile) {
      const mobileModule = await import('./require-handler-mobile.ts');
      this._platformRequireHandler = new mobileModule.RequireHandlerMobileComponent(this.params);
    } else {
      const desktopModule = await import('./require-handler-desktop.ts');
      this._platformRequireHandler = new desktopModule.RequireHandlerDesktopComponent(this.params);
    }

    this.addChild(this._platformRequireHandler);
  }

  public requireAsync(id: string, options?: Partial<RequireOptions>): Promise<unknown> {
    return this.platformRequireHandler.requireAsync(id, options);
  }

  public requireStringAsync(params: RequireHandlerFactoryComponentRequireStringAsyncParams): Promise<unknown> {
    return this.platformRequireHandler.requireStringAsync(params);
  }

  public requireVaultScriptAsync(id: string): Promise<unknown> {
    return this.platformRequireHandler.requireVaultScriptAsync(id);
  }
}
