import type { App } from 'obsidian';
import type { DataHandler } from 'obsidian-dev-utils/obsidian/data-handler';
import type { MaybeReturn } from 'obsidian-dev-utils/type';

import { parseYaml } from 'obsidian';
import { PluginSettingsComponentBase } from 'obsidian-dev-utils/obsidian/plugin/components/plugin-settings-component';
import {
  extname,
  join
} from 'obsidian-dev-utils/path';

import type { CodeButtonBlockConfig } from './code-button-block-config.ts';

import { PluginSettings } from './plugin-settings.ts';
import { EXTENSIONS } from './require-handlers/require-handler.ts';

interface PluginSettingsComponentConstructorParams {
  readonly app: App;
  readonly dataHandler: DataHandler;
}

class LegacySettings {
  public invocableScriptsDirectory = '';
}

export class PluginSettingsComponent extends PluginSettingsComponentBase<PluginSettings> {
  private readonly app: App;

  public constructor(params: PluginSettingsComponentConstructorParams) {
    super(params.dataHandler);
    this.app = params.app;
  }

  public parseDefaultCodeButtonConfig(yaml?: string): null | Partial<CodeButtonBlockConfig> {
    yaml ??= this.settings.defaultCodeButtonConfig;

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
      return await validatePath(this.app, path, 'folder');
    });

    this.registerValidator('startupScriptPath', async (value, settings): Promise<MaybeReturn<string>> => {
      if (!value) {
        return;
      }

      const path = join(settings.modulesRoot, value);
      const ans = await validatePath(this.app, path, 'file');
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
