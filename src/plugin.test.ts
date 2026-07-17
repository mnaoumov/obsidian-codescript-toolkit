import type {
  App as AppOriginal,
  PluginManifest
} from 'obsidian';
import type { CommandHandlerComponent } from 'obsidian-dev-utils/obsidian/command-handlers/command-handler-component';
import type { ConsoleDebugComponent } from 'obsidian-dev-utils/obsidian/components/console-debug-component';
import type { PluginNoticeComponent } from 'obsidian-dev-utils/obsidian/components/plugin-notice-component';
import type { ResourceLockComponent } from 'obsidian-dev-utils/obsidian/resource-lock';

import { castTo } from 'obsidian-dev-utils/object-utils';
import { strictProxy } from 'obsidian-dev-utils/strict-proxy';
import { App } from 'obsidian-test-mocks/obsidian';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { Plugin } from './plugin.ts';

vi.mock('obsidian-dev-utils/obsidian/command-handlers/open-settings-command-handler', () => ({
  OpenSettingsCommandHandler: vi.fn()
}));

vi.mock('obsidian-dev-utils/obsidian/data-handler', () => ({
  PluginDataHandler: vi.fn()
}));

vi.mock('obsidian-dev-utils/obsidian/markdown-code-block-processor-registrar', () => ({
  PluginMarkdownCodeBlockProcessorRegistrar: vi.fn()
}));

vi.mock('obsidian-dev-utils/obsidian/obsidian-protocol-handler-registrar', () => ({
  PluginObsidianProtocolHandlerRegistrar: vi.fn()
}));

vi.mock('obsidian-dev-utils/obsidian/components/plugin-settings-tab-component', () => ({
  PluginSettingsTabComponent: vi.fn()
}));

vi.mock('obsidian-dev-utils/obsidian/plugin/plugin-event-source', () => ({
  PluginEventSourceImpl: vi.fn()
}));

vi.mock('./code-button-block.ts', () => ({
  CodeButtonBlockComponent: vi.fn()
}));

vi.mock('./code-script-block.ts', () => ({
  CodeScriptBlockComponent: vi.fn()
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
  UnloadTempPluginsCommandHandler: vi.fn()
}));

vi.mock('./plugin-settings-component.ts', () => ({
  PluginSettingsComponent: vi.fn()
}));

vi.mock('./plugin-settings-tab.ts', () => ({
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

vi.mock('./script-registry.ts', () => ({
  ScriptRegistryComponent: vi.fn()
}));

vi.mock('./script.ts', () => ({
  ScriptManager: vi.fn()
}));

vi.mock('./startup-script.ts', () => ({
  StartupScriptComponent: vi.fn()
}));

vi.mock('./temp-plugin-registry.ts', () => ({
  TempPluginRegistryComponent: vi.fn()
}));

interface PluginPrivateApi {
  _commandHandlerComponent: CommandHandlerComponent;
  consoleDebugComponent: ConsoleDebugComponent;
  onloadImpl(): void;
  pluginNoticeComponent: PluginNoticeComponent;
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
  const EXPECTED_ADD_CHILD_COUNT = 10;
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
     * Seed it so `onloadImpl` can register its commands on the shared component in isolation.
     */
    castTo<PluginPrivateApi>(plugin)._commandHandlerComponent = strictProxy<CommandHandlerComponent>({
      registerCommandHandlers: vi.fn()
    });
    return plugin;
  }

  it('should call addChild for all components', () => {
    const plugin = createPlugin();
    const addChildSpy = vi.spyOn(plugin, 'addChild');

    castTo<PluginPrivateApi>(plugin).onloadImpl();

    expect(addChildSpy).toHaveBeenCalledTimes(EXPECTED_ADD_CHILD_COUNT);
  });

  it('should register the command handlers on the shared command handler component', () => {
    const plugin = createPlugin();

    castTo<PluginPrivateApi>(plugin).onloadImpl();

    const { registerCommandHandlers } = castTo<PluginPrivateApi>(plugin)._commandHandlerComponent;
    expect(registerCommandHandlers).toHaveBeenCalledOnce();
    expect(vi.mocked(registerCommandHandlers).mock.calls[0]?.[0]).toHaveLength(EXPECTED_COMMAND_HANDLER_COUNT);
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
