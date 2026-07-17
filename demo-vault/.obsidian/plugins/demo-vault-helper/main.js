'use strict';

const obsidian = require('obsidian');

const CODE_SCRIPT_TOOLKIT_ID = 'fix-require-modules';
const MODULES_ROOT = '_assets/CodeScriptToolkit';
const COMMUNITY_PLUGINS_URL = 'https://raw.githubusercontent.com/obsidianmd/obsidian-releases/HEAD/community-plugins.json';

// A tiny, plugin-agnostic bootstrap plugin for the demo vault. On layout-ready it
// makes sure CodeScript Toolkit is installed, configured, and enabled, so the demo
// notes' code-buttons work with no committed plugin config and no manual setup.
//
// It writes CodeScript Toolkit's settings BEFORE enabling it, so the plugin loads
// with them already applied (no reload). The install path replicates a store
// install with plain Obsidian internals because this committed copy cannot import
// obsidian-dev-utils (that is reachable only through CodeScript Toolkit's require).
class DemoVaultHelperPlugin extends obsidian.Plugin {
  onload() {
    this.app.workspace.onLayoutReady(() => {
      void this.bootstrap();
    });
  }

  async bootstrap() {
    try {
      await this.ensureCodeScriptToolkitInstalled();
      await this.configureCodeScriptToolkit();
      if (!this.app.plugins.enabledPlugins.has(CODE_SCRIPT_TOOLKIT_ID)) {
        await this.app.plugins.enablePluginAndSave(CODE_SCRIPT_TOOLKIT_ID);
      }
    } catch (error) {
      new obsidian.Notice(`Demo Vault Helper failed to bootstrap: ${error.message}`);
      console.error(error);
    }
  }

  async ensureCodeScriptToolkitInstalled() {
    if (this.app.plugins.manifests[CODE_SCRIPT_TOOLKIT_ID]) {
      return;
    }
    const registry = (await obsidian.requestUrl(COMMUNITY_PLUGINS_URL)).json;
    const entry = registry.find((plugin) => plugin.id === CODE_SCRIPT_TOOLKIT_ID);
    if (!entry) {
      throw new Error(`${CODE_SCRIPT_TOOLKIT_ID} is not in the community plugins registry`);
    }
    const release = (await obsidian.requestUrl(`https://api.github.com/repos/${entry.repo}/releases/latest`)).json;
    const version = release.tag_name;
    const manifest = (await obsidian.requestUrl(`https://github.com/${entry.repo}/releases/download/${version}/manifest.json`)).json;
    await this.app.plugins.installPlugin(entry.repo, version, manifest);
  }

  async configureCodeScriptToolkit() {
    const dataPath = `${this.app.vault.configDir}/plugins/${CODE_SCRIPT_TOOLKIT_ID}/data.json`;
    let data = {};
    if (await this.app.vault.adapter.exists(dataPath)) {
      data = JSON.parse(await this.app.vault.adapter.read(dataPath));
    }
    Object.assign(data, {
      invocableScriptsFolder: 'Invocables',
      modulesRoot: MODULES_ROOT,
      shouldHandleProtocolUrls: true,
      startupScriptPath: 'startup.ts'
    });
    await this.app.vault.adapter.write(dataPath, `${JSON.stringify(data, null, 2)}\n`);
  }
}

module.exports = DemoVaultHelperPlugin;
