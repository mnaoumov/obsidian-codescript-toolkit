import type { App } from 'obsidian';
import type { MaybeReturn } from 'obsidian-dev-utils/Type';

import { parseYaml } from 'obsidian';
import { PluginSettingsManagerBase } from 'obsidian-dev-utils/obsidian/Plugin/PluginSettingsManagerBase';
import {
  extname,
  join
} from 'obsidian-dev-utils/Path';

import type { CodeButtonBlockConfig } from './CodeButtonBlockConfig.ts';
import type { PluginTypes } from './PluginTypes.ts';

import { PluginSettings } from './PluginSettings.ts';
import { EXTENSIONS } from './RequireHandler.ts';

class LegacySettings {
  public invocableScriptsDirectory = '';
}

export class PluginSettingsManager extends PluginSettingsManagerBase<PluginTypes> {
  public parseDefaultCodeButtonConfig(yaml?: string): null | Partial<CodeButtonBlockConfig> {
    yaml ??= this.settingsWrapper.safeSettings.defaultCodeButtonConfig;

    if (!yaml) {
      return {};
    }

    const match = /^---\n(?:(?<YAML>(?:.|\n)*)\n)?---$/.exec(yaml);
    if (!match) {
      return null;
    }

    try {
      return parseYaml(match.groups?.['YAML'] ?? '') as Partial<CodeButtonBlockConfig>;
    } catch {
      return null;
    }
  }

  protected override createDefaultSettings(): PluginSettings {
    return new PluginSettings();
  }

  protected override registerLegacySettingsConverters(): void {
    this.registerLegacySettingsConverter(LegacySettings, (legacySettings) => {
      if (legacySettings.invocableScriptsDirectory) {
        legacySettings.invocableScriptsFolder = legacySettings.invocableScriptsDirectory;
      }
    });
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

    this.registerValidator('defaultCodeButtonConfig', (value): MaybeReturn<string> => {
      if (!this.parseDefaultCodeButtonConfig(value)) {
        return 'Invalid YAML';
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
