import type { RequireHandlerDesktop } from './require-handler-desktop.ts';
import type { RequireHandlerMobile } from './require-handler-mobile.ts';
import type {
  PluginRequireFn,
  RequireHandlerConstructorParams
} from './require-handler.ts';

import { createRequireHandler as createDesktopRequireHandler } from './require-handler-desktop.ts';
import { createRequireHandler as createMobileRequireHandler } from './require-handler-mobile.ts';
import { RequireHandler } from './require-handler.ts';

export class RequireHandlerEmulateMobile extends RequireHandler {
  private readonly desktopRequireHandler: RequireHandlerDesktop;
  private readonly mobileRequireHandler: RequireHandlerMobile;

  public constructor(params: RequireHandlerConstructorParams) {
    super(params);
    this.desktopRequireHandler = createDesktopRequireHandler(params);
    this.mobileRequireHandler = createMobileRequireHandler(params);
  }

  public override register2(pluginRequire: PluginRequireFn): void {
    super.register2(pluginRequire);
    this.desktopRequireHandler.register2(pluginRequire);
    this.mobileRequireHandler.register2(pluginRequire);
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

export function createRequireHandler(params: RequireHandlerConstructorParams): RequireHandlerEmulateMobile {
  return new RequireHandlerEmulateMobile(params);
}
