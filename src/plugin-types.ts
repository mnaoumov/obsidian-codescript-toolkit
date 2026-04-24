import type { PluginTypesBase } from 'obsidian-dev-utils/obsidian/plugin/plugin-types-base';

import type { Plugin } from './plugin.ts';
import type { PluginSettings } from './plugin-settings.ts';
import type { PluginSettingsManager } from './plugin-settings-manager.ts';
import type { PluginSettingsTab } from './plugin-settings-tab.ts';

export interface PluginTypes extends PluginTypesBase {
  plugin: Plugin;
  pluginSettings: PluginSettings;
  pluginSettingsManager: PluginSettingsManager;
  pluginSettingsTab: PluginSettingsTab;
}
