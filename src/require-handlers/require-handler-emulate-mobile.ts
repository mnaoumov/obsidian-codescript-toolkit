import type { RequireHandlerConstructorParams } from './require-handler.ts';

import { RequireHandlerDesktopComponent } from './require-handler-desktop.ts';
import { RequireHandlerMobileComponent } from './require-handler-mobile.ts';
import { RequireHandlerComponentBase } from './require-handler.ts';

export type RequireHandlerEmulateMobileComponentConstructorParams = RequireHandlerConstructorParams;

export class RequireHandlerEmulateMobileComponent extends RequireHandlerComponentBase {
  private readonly desktopRequireHandler: RequireHandlerDesktopComponent;
  private readonly mobileRequireHandler: RequireHandlerMobileComponent;

  public constructor(params: RequireHandlerEmulateMobileComponentConstructorParams) {
    super(params);
    this.desktopRequireHandler = new RequireHandlerDesktopComponent(params);
    this.mobileRequireHandler = new RequireHandlerMobileComponent(params);
  }

  protected override canRequireNonCached(): boolean {
    return this.mobileRequireHandler.canRequireNonCached();
  }

  protected override async existsFileAsync(path: string): Promise<boolean> {
    return this.desktopRequireHandler.existsFileAsync(path);
  }

  protected override async existsFolderAsync(path: string): Promise<boolean> {
    return this.desktopRequireHandler.existsFolderAsync(path);
  }

  protected override async getTimestampAsync(path: string): Promise<number> {
    return this.desktopRequireHandler.getTimestampAsync(path);
  }

  protected override async readFileAsync(path: string): Promise<string> {
    return this.desktopRequireHandler.readFileAsync(path);
  }

  protected override async readFileBinaryAsync(path: string): Promise<ArrayBuffer> {
    return this.desktopRequireHandler.readFileBinaryAsync(path);
  }

  protected override requireAsarPackedModule(id: string): unknown {
    return this.mobileRequireHandler.requireAsarPackedModule(id);
  }

  protected override requireElectronModule(id: string): unknown {
    return this.mobileRequireHandler.requireElectronModule(id);
  }

  protected override async requireNodeBinaryAsync(id: string): Promise<unknown> {
    return this.mobileRequireHandler.requireNodeBinaryAsync(id);
  }

  protected override requireNodeBuiltInModule(id: string): unknown {
    return this.mobileRequireHandler.requireNodeBuiltInModule(id);
  }

  protected override requireNonCached(id: string): unknown {
    return this.mobileRequireHandler.requireNonCached(id);
  }
}
