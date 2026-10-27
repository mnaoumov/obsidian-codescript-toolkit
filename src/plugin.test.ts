import type { CommandHandlerComponent } from '@mnaoumov/obsidian-lib/command-handlers/command-handler-component';
import type { ConsoleDebugComponent } from '@mnaoumov/obsidian-lib/components/console-debug-component';
import type { PluginNoticeComponent } from '@mnaoumov/obsidian-lib/components/plugin-notice-component';
import type { ResourceLockComponent } from '@mnaoumov/obsidian-lib/resource-lock';
import type {
  App as AppOriginal,
  PluginManifest
} from 'obsidian';

import { ComponentEx } from '@mnaoumov/obsidian-lib/components/component-ex';
import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import { strictProxy } from '@mnaoumov/typescript-test-toolkit/strict-proxy';
import { App } from 'obsidian-test-mocks/obsidian';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { Plugin } from './plugin.ts';

vi.mock('@mnaoumov/obsidian-lib/command-handlers/open-settings-command-handler', () => ({
  OpenSettingsCommandHandler: vi.fn()
}));

vi.mock('@mnaoumov/obsidian-lib/data-handler', () => ({
  PluginDataHandler: vi.fn()
}));

vi.mock('@mnaoumov/obsidian-lib/markdown-code-block-processor-registrar', () => ({
  PluginMarkdownCodeBlockProcessorRegistrar: vi.fn()
}));

vi.mock('@mnaoumov/obsidian-lib/components/plugin-settings-tab-component', () => ({
  PluginSettingsTabComponent: vi.fn()
}));

vi.mock('@mnaoumov/obsidian-lib/plugin/plugin-event-source', () => ({
  PluginEventSourceImpl: vi.fn()
}));

vi.mock('./code-buttons/code-button-block.ts', () => ({
  CodeButtonBlockComponent: vi.fn()
}));

vi.mock('./code-buttons/code-button-code-highlighter-component.ts', () => ({
  CodeButtonCodeHighlighterComponent: vi.fn()
}));

vi.mock('./vault-scripts/code-script-code-highlighter-component.ts', () => ({
  CodeScriptCodeHighlighterComponent: vi.fn()
}));

vi.mock('./command-handlers/clear-cache-command-handler.ts', () => ({
  ClearCacheCommandHandler: vi.fn()
}));

vi.mock('./command-handlers/invoke-script-choose-command-handler.ts', () => ({
  InvokeScriptChooseCommandHandler: vi.fn()
}));

vi.mock('./command-handlers/reload-startup-script-command-handler.ts', () => ({
  ReloadStartupScriptCommandHandler: vi.fn()
}));

vi.mock('./command-handlers/unload-temp-plugins-command-handler.ts', () => ({
  // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/07 Code buttons in depth/43 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
  UnloadTempPluginsCommandHandler: vi.fn()
}));

vi.mock('./settings/plugin-settings-component.ts', () => ({
  // A ComponentEx, not a bare mock: onloadImpl awaits its `loadWithPromises`.
  // eslint-disable-next-line prefer-arrow-callback, func-names -- mock must be constructable with `new` and return a real loadable Component.
  PluginSettingsComponent: vi.fn(function () {
    return new ComponentEx();
  })
}));

vi.mock('./settings/plugin-settings-tab.ts', () => ({
  PluginSettingsTab: vi.fn()
}));

vi.mock('./protocol-handler-component.ts', () => ({
  ProtocolHandlerComponent: vi.fn()
}));

vi.mock('./require-handlers/require-handler-factory.ts', () => ({
  RequireHandlerFactoryComponent: vi.fn()
}));

vi.mock('./script-folder-watchers/script-folder-watcher-factory.ts', () => ({
  ScriptFolderWatcherFactoryComponent: vi.fn()
}));

vi.mock('./vault-scripts/script-registry.ts', () => ({
  ScriptRegistryComponent: vi.fn()
}));

vi.mock('./vault-scripts/script.ts', () => ({
  ScriptManager: vi.fn()
}));

vi.mock('./vault-scripts/startup-script.ts', () => ({
  StartupScriptComponent: vi.fn()
}));

vi.mock('./temp-plugins/temporary-plugin-registry.ts', () => ({
  // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/07 Code buttons in depth/43 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
  TempPluginRegistryComponent: vi.fn()
}));

interface PluginPrivateApi {
  // eslint-disable-next-line typescript-dev-toolkit/readonly-interface-members -- Test setup injects this plugin dependency after construction.
  commandHandlerComponent: CommandHandlerComponent;
  // eslint-disable-next-line typescript-dev-toolkit/readonly-interface-members -- Test setup injects this plugin dependency after construction.
  consoleDebugComponent: ConsoleDebugComponent;
  readonly onloadImpl: () => Promise<void>;
  // eslint-disable-next-line typescript-dev-toolkit/readonly-interface-members -- Test setup injects this plugin dependency after construction.
  pluginNoticeComponent: PluginNoticeComponent;
  // eslint-disable-next-line typescript-dev-toolkit/readonly-interface-members -- Test setup injects this plugin dependency after construction.
  resourceLockComponent: ResourceLockComponent;
}

const manifest: PluginManifest = {
  author: 'test',
  description: 'test',
  id: 'test-plugin',
  minAppVersion: '0.0.1',
  name: 'Test Plugin',
  version: '1.0.0'
};

describe('Plugin', () => {
  const EXPECTED_ADD_CHILD_COUNT = 11;
  const EXPECTED_COMMAND_HANDLER_COUNT = 7;

  let app: AppOriginal;

  beforeEach(() => {
    app = App.createConfigured__().asOriginalType__();
  });

  function createPlugin(): Plugin {
    const plugin = new Plugin(app, manifest);
    /*
     * The console debug, plugin notice, and resource lock components are normally assigned during the universal `onload()` flow.
     * We assign them directly so `onloadImpl` can be exercised in isolation without the full lifecycle.
     */
    castTo<PluginPrivateApi>(plugin).consoleDebugComponent = strictProxy<ConsoleDebugComponent>({});
    castTo<PluginPrivateApi>(plugin).pluginNoticeComponent = strictProxy<PluginNoticeComponent>({});
    castTo<PluginPrivateApi>(plugin).resourceLockComponent = strictProxy<ResourceLockComponent>({});
    /*
     * The command handler component is normally wired by the base `onload()` before `onloadImpl` runs.
     * Seed it through the base accessor -- the components live in a bag
     * behind it, so writing a backing field no longer feeds the getter, which throws when unset.
     */
    castTo<PluginPrivateApi>(plugin).commandHandlerComponent = strictProxy<CommandHandlerComponent>({
      registerCommandHandlers: vi.fn()
    });
    return plugin;
  }

  it('should call addChild for all components', async () => {
    const plugin = createPlugin();
    const addChildSpy = vi.spyOn(plugin, 'addChild');

    await castTo<PluginPrivateApi>(plugin).onloadImpl();

    expect(addChildSpy).toHaveBeenCalledTimes(EXPECTED_ADD_CHILD_COUNT);
  });

  it('should register the command handlers on the shared command handler component', async () => {
    const plugin = createPlugin();

    await castTo<PluginPrivateApi>(plugin).onloadImpl();

    const { registerCommandHandlers } = castTo<PluginPrivateApi>(plugin).commandHandlerComponent;
    expect(registerCommandHandlers).toHaveBeenCalledOnce();
    // The handlers are built lazily by a factory, so build them here.
    const commandHandlerFactory = vi.mocked(registerCommandHandlers).mock.calls[0]?.[0];
    expect(commandHandlerFactory?.()).toHaveLength(EXPECTED_COMMAND_HANDLER_COUNT);
  });

  it('should expose the settings component it added as a child', async () => {
    const plugin = createPlugin();
    const addChildSpy = vi.spyOn(plugin, 'addChild');

    await castTo<PluginPrivateApi>(plugin).onloadImpl();

    // The settings component is the first child added, and the exposed member has to be that very
    // instance — a copy would not be the one the running plugin reads its settings from.
    expect(plugin.pluginSettingsComponent).toBe(addChildSpy.mock.calls[0]?.[0]);
    expect(plugin.pluginSettingsComponent).toBeDefined();
  });

  it('should assign app from constructor argument', () => {
    const plugin = new Plugin(app, manifest);
    expect(plugin.app).toBe(app);
  });

  it('should assign manifest from constructor argument', () => {
    const plugin = new Plugin(app, manifest);
    expect(plugin.manifest).toBe(manifest);
  });
});
