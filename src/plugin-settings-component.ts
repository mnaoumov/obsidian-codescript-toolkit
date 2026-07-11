import type { App } from 'obsidian';
import type { DataHandler } from 'obsidian-dev-utils/obsidian/data-handler';
import type { PluginEventSource } from 'obsidian-dev-utils/obsidian/plugin/plugin-event-source';
import type { MaybeReturn } from 'obsidian-dev-utils/type';

import { parseYaml } from 'obsidian';
import { PluginSettingsComponentBase } from 'obsidian-dev-utils/obsidian/components/plugin-settings-component';
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
  readonly pluginEventSource: PluginEventSource;
}

interface ValidatePathParams {
  readonly app: App;
  readonly path: string;
  readonly type: 'file' | 'folder';
}

class LegacySettings {
  public invocableScriptsDirectory = '';
}

export class PluginSettingsComponent extends PluginSettingsComponentBase<PluginSettings> {
  private readonly app: App;

  public constructor(params: PluginSettingsComponentConstructorParams) {
    super({
      ...params,
      pluginSettingsClass: PluginSettings
    });
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

      return await validatePath({ app: this.app, path: value, type: 'folder' });
    });

    this.registerValidator('invocableScriptsFolder', async (value, settings): Promise<MaybeReturn<string>> => {
      if (!value) {
        return;
      }

      const path = join(settings.modulesRoot, value);
      return await validatePath({ app: this.app, path, type: 'folder' });
    });

    this.registerValidator('startupScriptPath', async (value, settings): Promise<MaybeReturn<string>> => {
      if (!value) {
        return;
      }

      const path = join(settings.modulesRoot, value);
      const ans = await validatePath({ app: this.app, path, type: 'file' });
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

async function validatePath(params: ValidatePathParams): Promise<MaybeReturn<string>> {
  const { app, path, type } = params;
  if (!await app.vault.exists(path)) {
    return 'Path does not exist';
  }

  const stat = await app.vault.adapter.stat(path);
  if (stat?.type !== type) {
    return `Path is not a ${type}`;
  }
}
