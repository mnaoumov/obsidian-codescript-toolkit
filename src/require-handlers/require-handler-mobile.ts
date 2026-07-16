import { CapacitorAdapter } from 'obsidian';
import { noopAsync } from 'obsidian-dev-utils/function';

import type {
  RequireHandlerComponentBaseRequireNodeBinaryAsyncParams,
  RequireHandlerComponentBaseRequireNonCachedParams
} from './require-handler.ts';

import { RequireHandlerComponentBase } from './require-handler.ts';
import { splitQuery } from './split-query.ts';

export class RequireHandlerMobileComponent extends RequireHandlerComponentBase {
  protected override readonly canRequireSync: boolean = false;

  private get capacitorAdapter(): CapacitorAdapter {
    const adapter = this.app.vault.adapter;
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

  // eslint-disable-next-line obsidian-dev-utils/params-options-name-match -- Overrides the base method and must share its params type.
  public override async requireNodeBinaryAsync(params: RequireHandlerComponentBaseRequireNodeBinaryAsyncParams): Promise<unknown> {
    const { path } = params;
    await noopAsync();
    throw new Error(`Cannot require module: ${path}. Node binary modules are not available on mobile.`);
  }

  public override requireNodeBuiltInModule(id: string): unknown {
    if (id === 'crypto') {
      console.warn('Crypto module is not available on mobile. Consider using window.scrypt instead.');
      return null;
    }

    throw new Error(`Could not require module: ${id}. Node built-in modules are not available on mobile.`);
  }

  // eslint-disable-next-line obsidian-dev-utils/params-options-name-match -- Overrides the base method and must share its params type.
  public override requireNonCached(params: RequireHandlerComponentBaseRequireNonCachedParams): unknown {
    const { id } = params;
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
