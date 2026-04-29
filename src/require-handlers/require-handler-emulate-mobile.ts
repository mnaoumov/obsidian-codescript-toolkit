import type { RequireHandlerConstructorParams } from './require-handler.ts';

import { RequireHandlerDesktop } from './require-handler-desktop.ts';
import { RequireHandlerMobile } from './require-handler-mobile.ts';
import { RequireHandlerBase } from './require-handler.ts';

export class RequireHandlerEmulateMobile extends RequireHandlerBase {
  private readonly desktopRequireHandler: RequireHandlerDesktop;
  private readonly mobileRequireHandler: RequireHandlerMobile;

  public constructor(params: RequireHandlerConstructorParams) {
    super(params);
    this.desktopRequireHandler = this.addChild(new RequireHandlerDesktop(params));
    this.mobileRequireHandler = this.addChild(new RequireHandlerMobile(params));
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
