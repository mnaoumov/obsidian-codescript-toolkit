import type { PluginTypesBase } from 'obsidian-dev-utils/obsidian/plugin/plugin-types-base';

import type { Plugin } from './Plugin.ts';
import type { PluginSettings } from './PluginSettings.ts';
import type { PluginSettingsManager } from './PluginSettingsManager.ts';
import type { PluginSettingsTab } from './PluginSettingsTab.ts';

export interface PluginTypes extends PluginTypesBase {
  plugin: Plugin;
  pluginSettings: PluginSettings;
  pluginSettingsManager: PluginSettingsManager;
  pluginSettingsTab: PluginSettingsTab;
}
