import type { App } from 'obsidian';
import type { PluginNoticeComponent } from 'obsidian-dev-utils/obsidian/components/plugin-notice-component';

import { Component } from 'obsidian';
import { noop } from 'obsidian-dev-utils/function';
import { castTo } from 'obsidian-dev-utils/object-utils';
import { strictProxy } from 'obsidian-dev-utils/strict-proxy';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { PluginSettingsComponent } from './plugin-settings-component.ts';
import type { RequireHandlerFactoryComponent } from './require-handlers/require-handler-factory.ts';

import { StartupScriptComponent } from './startup-script.ts';

interface MockApp {
  vault: MockVault;
}

interface MockPluginSettingsComponent {
  settings: MockSettings;
}

interface MockRequireHandlerFactoryComponent {
  requireVaultScriptAsync: ReturnType<typeof vi.fn>;
}

interface MockSettings {
  getStartupScriptPath: ReturnType<typeof vi.fn>;
}

interface MockVault {
  exists: ReturnType<typeof vi.fn>;
}

function createMockApp(): MockApp {
  return {
    vault: {
      exists: vi.fn()
    }
  };
}

function createMockPluginSettingsComponent(): MockPluginSettingsComponent {
  return {
    settings: {
      getStartupScriptPath: vi.fn()
    }
  };
}

function createMockRequireHandlerFactoryComponent(): MockRequireHandlerFactoryComponent {
  return {
    requireVaultScriptAsync: vi.fn()
  };
}

describe('StartupScriptComponent', () => {
  let mockApp: MockApp;
  let mockPluginSettingsComponent: MockPluginSettingsComponent;
  let mockRequireHandlerFactoryComponent: MockRequireHandlerFactoryComponent;
  let component: StartupScriptComponent;

  beforeEach(() => {
    mockApp = createMockApp();
    mockPluginSettingsComponent = createMockPluginSettingsComponent();
    mockRequireHandlerFactoryComponent = createMockRequireHandlerFactoryComponent();

    component = new StartupScriptComponent({
      app: castTo<App>(mockApp),
      pluginNoticeComponent: strictProxy<PluginNoticeComponent>({
        showNotice: vi.fn()
      }),
      pluginSettingsComponent: castTo<PluginSettingsComponent>(mockPluginSettingsComponent),
      requireHandlerFactoryComponent: castTo<RequireHandlerFactoryComponent>(mockRequireHandlerFactoryComponent)
    });
  });

  describe('constructor', () => {
    it('should create a StartupScriptComponent that extends Component', () => {
      expect(component).toBeInstanceOf(Component);
    });
  });

  describe('cleanupStartupScript', () => {
    it('should return immediately when no startup script is loaded', async () => {
      await component['cleanupStartupScript']();
      expect(mockRequireHandlerFactoryComponent.requireVaultScriptAsync).not.toHaveBeenCalled();
    });

    it('should call cleanup on the startup script when it has a cleanup function', async () => {
      const mockCleanup = vi.fn().mockResolvedValue(undefined);
      const mockInvoke = vi.fn().mockResolvedValue(undefined);

      mockPluginSettingsComponent.settings.getStartupScriptPath.mockReturnValue('startup.ts');
      mockApp.vault.exists.mockResolvedValue(true);
      mockRequireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
        cleanup: mockCleanup,
        invoke: mockInvoke
      });

      await component['invokeStartupScript']();
      await component['cleanupStartupScript']();

      expect(mockCleanup).toHaveBeenCalledWith(mockApp);
    });

    it('should set startupScript to null after cleanup', async () => {
      const mockInvoke = vi.fn().mockResolvedValue(undefined);

      mockPluginSettingsComponent.settings.getStartupScriptPath.mockReturnValue('startup.ts');
      mockApp.vault.exists.mockResolvedValue(true);
      mockRequireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
        invoke: mockInvoke
      });

      await component['invokeStartupScript']();
      await component['cleanupStartupScript']();

      // After cleanup, invoking again should not throw "already invoked"
      mockPluginSettingsComponent.settings.getStartupScriptPath.mockReturnValue('');
      await component['invokeStartupScript']();
      expect(mockInvoke).toHaveBeenCalledTimes(1);
    });

    it('should work when startup script has no cleanup function', async () => {
      const mockInvoke = vi.fn().mockResolvedValue(undefined);

      mockPluginSettingsComponent.settings.getStartupScriptPath.mockReturnValue('startup.ts');
      mockApp.vault.exists.mockResolvedValue(true);
      mockRequireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
        invoke: mockInvoke
      });

      await component['invokeStartupScript']();
      await expect(component['cleanupStartupScript']()).resolves.toBeUndefined();
    });
  });

  describe('invokeStartupScript', () => {
    it('should throw when startup script is already invoked', async () => {
      const mockInvoke = vi.fn().mockResolvedValue(undefined);

      mockPluginSettingsComponent.settings.getStartupScriptPath.mockReturnValue('startup.ts');
      mockApp.vault.exists.mockResolvedValue(true);
      mockRequireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
        invoke: mockInvoke
      });

      await component['invokeStartupScript']();

      await expect(component['invokeStartupScript']()).rejects.toThrow('Startup script already invoked');
    });

    it('should return early when startup script path is not configured', async () => {
      mockPluginSettingsComponent.settings.getStartupScriptPath.mockReturnValue('');

      await component['invokeStartupScript']();

      expect(mockRequireHandlerFactoryComponent.requireVaultScriptAsync).not.toHaveBeenCalled();
    });

    it('should show notice and return when startup script file does not exist', async () => {
      const SCRIPT_PATH = 'missing-script.ts';
      mockPluginSettingsComponent.settings.getStartupScriptPath.mockReturnValue(SCRIPT_PATH);
      mockApp.vault.exists.mockResolvedValue(false);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        noop();
      });

      try {
        await component['invokeStartupScript']();

        expect(mockRequireHandlerFactoryComponent.requireVaultScriptAsync).not.toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith(`Startup script not found: ${SCRIPT_PATH}`);
      } finally {
        consoleErrorSpy.mockRestore();
      }
    });

    it('should require and invoke the script when path is valid', async () => {
      const SCRIPT_PATH = 'startup.ts';
      const mockInvoke = vi.fn().mockResolvedValue(undefined);

      mockPluginSettingsComponent.settings.getStartupScriptPath.mockReturnValue(SCRIPT_PATH);
      mockApp.vault.exists.mockResolvedValue(true);
      mockRequireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
        invoke: mockInvoke
      });

      await component['invokeStartupScript']();

      expect(mockRequireHandlerFactoryComponent.requireVaultScriptAsync).toHaveBeenCalledWith(SCRIPT_PATH);
      expect(mockInvoke).toHaveBeenCalledWith(mockApp);
    });
  });

  describe('onLayoutReady', () => {
    it('should invoke the startup script and register cleanup', async () => {
      const mockInvoke = vi.fn().mockResolvedValue(undefined);
      const mockCleanup = vi.fn().mockResolvedValue(undefined);
      const SCRIPT_PATH = 'startup.ts';

      mockPluginSettingsComponent.settings.getStartupScriptPath.mockReturnValue(SCRIPT_PATH);
      mockApp.vault.exists.mockResolvedValue(true);
      mockRequireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
        cleanup: mockCleanup,
        invoke: mockInvoke
      });

      await component.onLayoutReady();

      expect(mockInvoke).toHaveBeenCalledWith(mockApp);
    });

    it('should register cleanup when no script is configured', async () => {
      mockPluginSettingsComponent.settings.getStartupScriptPath.mockReturnValue('');

      await component.onLayoutReady();

      // No error should occur; the method completes gracefully
      expect(mockRequireHandlerFactoryComponent.requireVaultScriptAsync).not.toHaveBeenCalled();
    });

    it('should invoke the registered cleanup callback', async () => {
      const mockInvoke = vi.fn().mockResolvedValue(undefined);
      const mockCleanup = vi.fn().mockResolvedValue(undefined);
      const SCRIPT_PATH = 'startup.ts';

      mockPluginSettingsComponent.settings.getStartupScriptPath.mockReturnValue(SCRIPT_PATH);
      mockApp.vault.exists.mockResolvedValue(true);
      mockRequireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
        cleanup: mockCleanup,
        invoke: mockInvoke
      });

      let registeredCallback: (() => void) | null = null;
      const registerSpy = vi.spyOn(component, 'register').mockImplementation((fn: () => void) => {
        registeredCallback = fn;
      });

      await component.onLayoutReady();

      expect(registeredCallback).not.toBeNull();
      const asyncCallback = registeredCallback;
      await castTo<() => Promise<void>>(asyncCallback)();

      expect(mockCleanup).toHaveBeenCalledWith(mockApp);
      registerSpy.mockRestore();
    });
  });

  describe('reloadStartupScript', () => {
    it('should cleanup and then invoke the startup script', async () => {
      const mockInvoke = vi.fn().mockResolvedValue(undefined);
      const mockCleanup = vi.fn().mockResolvedValue(undefined);
      const SCRIPT_PATH = 'startup.ts';

      mockPluginSettingsComponent.settings.getStartupScriptPath.mockReturnValue(SCRIPT_PATH);
      mockApp.vault.exists.mockResolvedValue(true);
      mockRequireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
        cleanup: mockCleanup,
        invoke: mockInvoke
      });

      await component['invokeStartupScript']();

      const mockInvoke2 = vi.fn().mockResolvedValue(undefined);
      mockRequireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
        invoke: mockInvoke2
      });

      await component.reloadStartupScript();

      expect(mockCleanup).toHaveBeenCalledWith(mockApp);
      expect(mockInvoke2).toHaveBeenCalledWith(mockApp);
    });

    it('should work when no script was previously loaded', async () => {
      mockPluginSettingsComponent.settings.getStartupScriptPath.mockReturnValue('');

      await component.reloadStartupScript();

      expect(mockRequireHandlerFactoryComponent.requireVaultScriptAsync).not.toHaveBeenCalled();
    });
  });

  describe('validateStartupScript with shouldWarnOnNotConfigured', () => {
    it('should show notice and warn when startup script path is empty and shouldWarnOnNotConfigured is true', async () => {
      mockPluginSettingsComponent.settings.getStartupScriptPath.mockReturnValue('');
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
        noop();
      });

      try {
        const validateStartupScript = Reflect.get(component, 'validateStartupScript') as (shouldWarn: boolean) => Promise<null | string>;
        const result = await validateStartupScript.call(component, true);

        expect(result).toBeNull();
        expect(consoleWarnSpy).toHaveBeenCalledWith('Startup script is not configured');
      } finally {
        consoleWarnSpy.mockRestore();
      }
    });
  });
});
