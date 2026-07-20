import type { App } from 'obsidian';

import { Notice } from 'obsidian';
import {
  configureCommunityPlugin,
  enableCommunityPlugin,
  installCommunityPlugin
} from 'obsidian-dev-utils/obsidian/community-plugins';

/**
 * Installs a community plugin, writes its settings, THEN enables it — in that order — so the
 * plugin reads the correct configuration on its first load (a plugin enabled before it is
 * configured runs its `onload` with default settings and does nothing useful).
 */
export async function installConfigureEnable(app: App, pluginId: string, settings?: Record<string, unknown>): Promise<void> {
  await installCommunityPlugin({ app, pluginId });
  if (settings) {
    await configureCommunityPlugin({ app, pluginId, settings });
  }
  await enableCommunityPlugin({ app, pluginId });
  new Notice(`Installed, configured and enabled: ${pluginId}`);
}
