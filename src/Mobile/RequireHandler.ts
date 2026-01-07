import { CapacitorAdapter } from 'obsidian';

import {
  RequireHandler,
  splitQuery
} from '../RequireHandler.ts';

class RequireHandlerImpl extends RequireHandler {
  private get capacitorAdapter(): CapacitorAdapter {
    const adapter = this.plugin.app.vault.adapter;
    if (!(adapter instanceof CapacitorAdapter)) {
      throw new Error('Vault adapter is not a CapacitorAdapter.');
    }

    return adapter;
  }

  public override canRequireNonCached(): boolean {
    return false;
  }

  public override requireAsarPackedModule(id: string): unknown {
    throw new Error(`Could not require module: ${id}. ASAR packed modules are not available on mobile.`);
  }

  public override requireElectronModule(id: string): unknown {
    throw new Error(`Could not require module: ${id}. Electron modules are not available on mobile.`);
  }

  public override async requireNodeBinaryAsync(id: string): Promise<unknown> {
    await Promise.resolve();
    throw new Error(`Cannot require module: ${id}. Node binary modules are not available on mobile.`);
  }

  public override requireNodeBuiltInModule(id: string): unknown {
    if (id === 'crypto') {
      console.warn('Crypto module is not available on mobile. Consider using window.scrypt instead.');
      return null;
    }

    throw new Error(`Could not require module: ${id}. Node built-in modules are not available on mobile.`);
  }

  public override requireNonCached(id: string): unknown {
    throw new Error(`Cannot require synchronously on mobile: '${id}'.`);
  }

  protected override async existsFileAsync(path: string): Promise<boolean> {
    path = splitQuery(path).cleanStr;
    if (!await this.capacitorAdapter.fs.exists(path)) {
      return false;
    }

    const stat = await this.capacitorAdapter.fs.stat(path);
    return stat.type === 'file';
  }

  protected override async existsFolderAsync(path: string): Promise<boolean> {
    path = splitQuery(path).cleanStr;
    if (!await this.capacitorAdapter.fs.exists(path)) {
      return false;
    }

    const stat = await this.capacitorAdapter.fs.stat(path);
    return stat.type === 'directory';
  }

  protected override async getTimestampAsync(path: string): Promise<number> {
    path = splitQuery(path).cleanStr;
    const stat = await this.capacitorAdapter.fs.stat(path);
    return stat.mtime ?? 0;
  }

  protected override async readFileAsync(path: string): Promise<string> {
    path = splitQuery(path).cleanStr;
    return await this.capacitorAdapter.fs.read(path);
  }

  protected override async readFileBinaryAsync(path: string): Promise<ArrayBuffer> {
    path = splitQuery(path).cleanStr;
    return await this.capacitorAdapter.fs.readBinary(path);
  }
}

export const requireHandler = new RequireHandlerImpl();
