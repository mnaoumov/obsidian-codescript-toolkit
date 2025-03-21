import { CapacitorAdapter } from 'obsidian';

import {
  MODULE_TO_SKIP,
  RequireHandler,
  trimNodePrefix
} from '../RequireHandler.ts';

class RequireHandlerImpl extends RequireHandler {
  private get capacitorAdapter(): CapacitorAdapter {
    const adapter = this.plugin.app.vault.adapter;
    if (!(adapter instanceof CapacitorAdapter)) {
      throw new Error('Vault adapter is not a CapacitorAdapter');
    }

    return adapter;
  }

  protected override canRequireNonCached(): boolean {
    return false;
  }

  protected override async existsDirectoryAsync(path: string): Promise<boolean> {
    if (!await this.capacitorAdapter.fs.exists(path)) {
      return false;
    }

    const stat = await this.capacitorAdapter.fs.stat(path);
    return stat.type === 'directory';
  }

  protected override async existsFileAsync(path: string): Promise<boolean> {
    if (!await this.capacitorAdapter.fs.exists(path)) {
      return false;
    }

    const stat = await this.capacitorAdapter.fs.stat(path);
    return stat.type === 'file';
  }

  protected override async getTimestampAsync(path: string): Promise<number> {
    const stat = await this.capacitorAdapter.fs.stat(path);
    return stat.mtime ?? 0;
  }

  protected override async readFileAsync(path: string): Promise<string> {
    return await this.capacitorAdapter.fs.read(path);
  }

  protected override async readFileBinaryAsync(path: string): Promise<ArrayBuffer> {
    return await this.capacitorAdapter.fs.readBinary(path);
  }

  protected override async requireNodeBinaryAsync(): Promise<unknown> {
    await Promise.resolve();
    throw new Error('Cannot require node binary on mobile');
  }

  protected override requireNonCached(): unknown {
    throw new Error('Cannot require synchronously on mobile');
  }

  protected override requireSpecialModule(id: string): unknown {
    const module = super.requireSpecialModule(id);
    if (module) {
      return module;
    }

    if (trimNodePrefix(id) === 'crypto') {
      console.warn('Crypto module is not available on mobile. Consider using window.scrypt instead');
      return MODULE_TO_SKIP;
    }

    return null;
  }
}

export const requireHandler = new RequireHandlerImpl();
