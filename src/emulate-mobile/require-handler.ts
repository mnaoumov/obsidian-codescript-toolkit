import type { Plugin } from '../plugin.ts';
import type { PluginRequireFn } from '../require-handler.ts';

import { requireHandler as desktopRequireHandler } from '../desktop/require-handler.ts';
import { requireHandler as mobileRequireHandler } from '../mobile/require-handler.ts';
import { RequireHandler } from '../require-handler.ts';

class RequireHandlerImpl extends RequireHandler {
  public override async register(plugin: Plugin, pluginRequire: PluginRequireFn): Promise<void> {
    await super.register(plugin, pluginRequire);
    await desktopRequireHandler.register(plugin, pluginRequire);
    await mobileRequireHandler.register(plugin, pluginRequire);
  }

  protected override canRequireNonCached(): boolean {
    return mobileRequireHandler.canRequireNonCached();
  }

  protected override async existsFileAsync(path: string): Promise<boolean> {
    return desktopRequireHandler.existsFileAsync(path);
  }

  protected override async existsFolderAsync(path: string): Promise<boolean> {
    return desktopRequireHandler.existsFolderAsync(path);
  }

  protected override async getTimestampAsync(path: string): Promise<number> {
    return desktopRequireHandler.getTimestampAsync(path);
  }

  protected override async readFileAsync(path: string): Promise<string> {
    return desktopRequireHandler.readFileAsync(path);
  }

  protected override async readFileBinaryAsync(path: string): Promise<ArrayBuffer> {
    return desktopRequireHandler.readFileBinaryAsync(path);
  }

  protected override requireAsarPackedModule(id: string): unknown {
    return mobileRequireHandler.requireAsarPackedModule(id);
  }

  protected override requireElectronModule(id: string): unknown {
    return mobileRequireHandler.requireElectronModule(id);
  }

  protected override async requireNodeBinaryAsync(id: string): Promise<unknown> {
    return mobileRequireHandler.requireNodeBinaryAsync(id);
  }

  protected override requireNodeBuiltInModule(id: string): unknown {
    return mobileRequireHandler.requireNodeBuiltInModule(id);
  }

  protected override requireNonCached(id: string): unknown {
    return mobileRequireHandler.requireNonCached(id);
  }
}

export const requireHandler = new RequireHandlerImpl();
