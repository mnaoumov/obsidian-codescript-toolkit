import type {
  App,
  PluginManifest
} from 'obsidian';

import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { Plugin } from './plugin.ts';

interface MockManifest {
  name: string;
}

const mockAddChild = vi.fn((child: unknown) => child);

vi.mock('obsidian-dev-utils/obsidian/plugin/plugin', () => ({
  PluginBase: class MockPluginBase {
    public app: unknown;
    public consoleDebugComponent = {};
    public manifest: MockManifest;

    public constructor(app: unknown, manifest: PluginManifest) {
      this.app = app;
      this.manifest = manifest;
    }

    public addChild(child: unknown): unknown {
      return mockAddChild(child);
    }
  }
}));

vi.mock('obsidian-dev-utils/obsidian/active-file-provider', () => ({
  AppActiveFileProvider: vi.fn()
}));

vi.mock('obsidian-dev-utils/obsidian/command-handlers/command-handler-component', () => ({
  CommandHandlerComponent: vi.fn()
}));

vi.mock('obsidian-dev-utils/obsidian/command-registrar', () => ({
  PluginCommandRegistrar: vi.fn()
}));

vi.mock('obsidian-dev-utils/obsidian/data-handler', () => ({
  PluginDataHandler: vi.fn()
}));

vi.mock('obsidian-dev-utils/obsidian/markdown-code-block-processor-registrar', () => ({
  PluginMarkdownCodeBlockProcessorRegistrar: vi.fn()
}));

vi.mock('obsidian-dev-utils/obsidian/menu-event-registrar', () => ({
  AppMenuEventRegistrar: vi.fn()
}));

vi.mock('obsidian-dev-utils/obsidian/obsidian-protocol-handler-registrar', () => ({
  PluginObsidianProtocolHandlerRegistrar: vi.fn()
}));

vi.mock('obsidian-dev-utils/obsidian/components/plugin-settings-tab-component', () => ({
  PluginSettingsTabComponent: vi.fn()
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
  RequireHandlerFactory: vi.fn()
}));

vi.mock('./script-folder-watchers/script-folder-watcher-factory.ts', () => ({
  ScriptFolderWatcherFactory: vi.fn()
}));

vi.mock('./script-registry.ts', () => ({
  ScriptRegistry: vi.fn()
}));

vi.mock('./script.ts', () => ({
  ScriptManager: vi.fn()
}));

vi.mock('./startup-script.ts', () => ({
  StartupScriptComponent: vi.fn()
}));

vi.mock('./temp-plugin-registry.ts', () => ({
  TempPluginRegistry: vi.fn()
}));

describe('Plugin', () => {
  const EXPECTED_ADD_CHILD_COUNT = 11;

  it('should call addChild for all components', () => {
    const mockApp: Partial<App> = { vault: {} as App['vault'] };
    const mockManifest: PluginManifest = {
      author: 'test',
      description: 'test',
      id: 'test-plugin',
      minAppVersion: '0.0.1',
      name: 'Test Plugin',
      version: '1.0.0'
    };

    new Plugin(mockApp as App, mockManifest);

    expect(mockAddChild).toHaveBeenCalledTimes(EXPECTED_ADD_CHILD_COUNT);
  });

  it('should assign app from constructor argument', () => {
    const mockApp: Partial<App> = { vault: {} as App['vault'] };
    const mockManifest: PluginManifest = {
      author: 'test',
      description: 'test',
      id: 'test-plugin',
      minAppVersion: '0.0.1',
      name: 'Test Plugin',
      version: '1.0.0'
    };

    const plugin = new Plugin(mockApp as App, mockManifest);

    expect(plugin.app).toBe(mockApp);
  });

  it('should assign manifest from constructor argument', () => {
    const mockApp: Partial<App> = { vault: {} as App['vault'] };
    const mockManifest: PluginManifest = {
      author: 'test',
      description: 'test',
      id: 'test-plugin',
      minAppVersion: '0.0.1',
      name: 'Test Plugin',
      version: '1.0.0'
    };

    const plugin = new Plugin(mockApp as App, mockManifest);

    expect(plugin.manifest).toBe(mockManifest);
  });
});
