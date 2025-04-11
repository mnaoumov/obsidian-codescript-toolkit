import type { App } from 'obsidian';
import type { MaybeReturn } from 'obsidian-dev-utils/Type';

import { PluginSettingsManagerBase } from 'obsidian-dev-utils/obsidian/Plugin/PluginSettingsManagerBase';
import {
  extname,
  join
} from 'obsidian-dev-utils/Path';

import type { PluginTypes } from './PluginTypes.ts';

import { PluginSettings } from './PluginSettings.ts';
import { EXTENSIONS } from './RequireHandler.ts';

interface LegacySettings {
  invocableScriptsDirectory: string;
}

export class PluginSettingsManager extends PluginSettingsManagerBase<PluginTypes> {
  protected override createDefaultSettings(): PluginSettings {
    return new PluginSettings();
  }

  protected override async onLoadRecord(record: Record<string, unknown>): Promise<void> {
    await super.onLoadRecord(record);
    const legacySettings = record as Partial<LegacySettings> & Partial<PluginSettings>;
    if (legacySettings.invocableScriptsDirectory) {
      legacySettings.invocableScriptsFolder = legacySettings.invocableScriptsDirectory;
      delete legacySettings.invocableScriptsDirectory;
    }
  }

  protected override registerValidators(): void {
    this.registerValidator('modulesRoot', async (value): Promise<MaybeReturn<string>> => {
      if (!value) {
        return;
      }

      return await validatePath(this.app, value, 'folder');
    });

    this.registerValidator('invocableScriptsFolder', async (value, settings): Promise<MaybeReturn<string>> => {
      if (!value) {
        return;
      }

      const path = join(settings.modulesRoot, value);
      return await validatePath(this.plugin.app, path, 'folder');
    });

    this.registerValidator('startupScriptPath', async (value, settings): Promise<MaybeReturn<string>> => {
      if (!value) {
        return;
      }

      const path = join(settings.modulesRoot, value);
      const ans = await validatePath(this.plugin.app, path, 'file');
      if (ans) {
        return ans;
      }

      const ext = extname(path);
      if (!EXTENSIONS.includes(ext)) {
        return `Only the following extensions are supported: ${EXTENSIONS.join(', ')}`;
      }
    });
  }
}

async function validatePath(app: App, path: string, type: 'file' | 'folder'): Promise<MaybeReturn<string>> {
  if (!await app.vault.exists(path)) {
    return 'Path does not exist';
  }

  const stat = await app.vault.adapter.stat(path);
  if (stat?.type !== type) {
    return `Path is not a ${type}`;
  }
}
