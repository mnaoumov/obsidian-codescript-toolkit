import { Platform } from 'obsidian';
import { AsyncComponentBase } from 'obsidian-dev-utils/obsidian/components/async-component';
import { ensureNonNullable } from 'obsidian-dev-utils/type-guards';

import type {
  RequireHandler,
  RequireHandlerConstructorParams
} from './require-handler.ts';

export class RequireHandlerFactory extends AsyncComponentBase {
  public get platformRequireHandler(): RequireHandler {
    return ensureNonNullable(this._platformRequireHandler);
  }

  private _platformRequireHandler?: RequireHandler;

  public constructor(private readonly params: RequireHandlerConstructorParams) {
    super();
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
}
