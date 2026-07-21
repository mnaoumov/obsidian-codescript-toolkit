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
  let mockShowNotice: ReturnType<typeof vi.fn>;
  let component: StartupScriptComponent;

  beforeEach(() => {
    mockApp = createMockApp();
    mockPluginSettingsComponent = createMockPluginSettingsComponent();
    mockRequireHandlerFactoryComponent = createMockRequireHandlerFactoryComponent();
    mockShowNotice = vi.fn();

    component = new StartupScriptComponent({
      app: castTo<App>(mockApp),
      pluginNoticeComponent: strictProxy<PluginNoticeComponent>({
        showNotice: castTo<PluginNoticeComponent['showNotice']>(mockShowNotice)
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

  describe('onloadAsync', () => {
    it('should invoke the script during load when shouldExecuteOnLoad returns true', async () => {
      const mockInvoke = vi.fn().mockResolvedValue(undefined);
      const mockShouldExecuteOnLoad = vi.fn().mockResolvedValue(true);

      mockPluginSettingsComponent.settings.getStartupScriptPath.mockReturnValue('startup.ts');
      mockApp.vault.exists.mockResolvedValue(true);
      mockRequireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
        invoke: mockInvoke,
        shouldExecuteOnLoad: mockShouldExecuteOnLoad
      });

      await component.onloadAsync();

      expect(mockShouldExecuteOnLoad).toHaveBeenCalledWith(mockApp);
      expect(mockInvoke).toHaveBeenCalledWith(mockApp);
    });

    it('should not invoke again on layout ready when it already executed on load', async () => {
      const mockInvoke = vi.fn().mockResolvedValue(undefined);

      mockPluginSettingsComponent.settings.getStartupScriptPath.mockReturnValue('startup.ts');
      mockApp.vault.exists.mockResolvedValue(true);
      mockRequireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
        invoke: mockInvoke,
        shouldExecuteOnLoad: vi.fn().mockResolvedValue(true)
      });

      await component.onloadAsync();
      await component.onLayoutReady();

      expect(mockInvoke).toHaveBeenCalledTimes(1);
    });

    it('should load but not invoke when shouldExecuteOnLoad returns false', async () => {
      const mockInvoke = vi.fn().mockResolvedValue(undefined);

      mockPluginSettingsComponent.settings.getStartupScriptPath.mockReturnValue('startup.ts');
      mockApp.vault.exists.mockResolvedValue(true);
      mockRequireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
        invoke: mockInvoke,
        shouldExecuteOnLoad: vi.fn().mockResolvedValue(false)
      });

      await component.onloadAsync();
      expect(mockInvoke).not.toHaveBeenCalled();

      await component.onLayoutReady();
      expect(mockInvoke).toHaveBeenCalledWith(mockApp);
    });

    it('should load but not invoke when shouldExecuteOnLoad is absent', async () => {
      const mockInvoke = vi.fn().mockResolvedValue(undefined);

      mockPluginSettingsComponent.settings.getStartupScriptPath.mockReturnValue('startup.ts');
      mockApp.vault.exists.mockResolvedValue(true);
      mockRequireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
        invoke: mockInvoke
      });

      await component.onloadAsync();
      expect(mockInvoke).not.toHaveBeenCalled();

      await component.onLayoutReady();
      expect(mockInvoke).toHaveBeenCalledWith(mockApp);
    });

    it('should not require the script when the path is not configured', async () => {
      mockPluginSettingsComponent.settings.getStartupScriptPath.mockReturnValue('');

      await component.onloadAsync();

      expect(mockRequireHandlerFactoryComponent.requireVaultScriptAsync).not.toHaveBeenCalled();
    });

    it('should report and not rethrow when the script fails during load', async () => {
      mockPluginSettingsComponent.settings.getStartupScriptPath.mockReturnValue('startup.ts');
      mockApp.vault.exists.mockResolvedValue(true);
      const error = new Error('boom');
      mockRequireHandlerFactoryComponent.requireVaultScriptAsync.mockRejectedValue(error);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        noop();
      });

      try {
        await expect(component.onloadAsync()).resolves.toBeUndefined();

        expect(mockShowNotice).toHaveBeenCalledWith('Error executing startup script on load');
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error executing startup script on load', error);
      } finally {
        consoleErrorSpy.mockRestore();
      }
    });
  });

  describe('onLayoutReady', () => {
    it('should invoke the startup script when it did not execute on load', async () => {
      const mockInvoke = vi.fn().mockResolvedValue(undefined);
      const SCRIPT_PATH = 'startup.ts';

      mockPluginSettingsComponent.settings.getStartupScriptPath.mockReturnValue(SCRIPT_PATH);
      mockApp.vault.exists.mockResolvedValue(true);
      mockRequireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
        invoke: mockInvoke
      });

      await component.onloadAsync();
      await component.onLayoutReady();

      expect(mockInvoke).toHaveBeenCalledWith(mockApp);
    });

    it('should complete gracefully when no script is configured', async () => {
      mockPluginSettingsComponent.settings.getStartupScriptPath.mockReturnValue('');

      await component.onloadAsync();
      await component.onLayoutReady();

      expect(mockRequireHandlerFactoryComponent.requireVaultScriptAsync).not.toHaveBeenCalled();
    });

    it('should invoke the cleanup registered on load', async () => {
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

      await component.onloadAsync();
      await component.onLayoutReady();

      expect(registeredCallback).not.toBeNull();
      const asyncCallback = registeredCallback;
      await castTo<() => Promise<void>>(asyncCallback)();

      expect(mockCleanup).toHaveBeenCalledWith(mockApp);
      registerSpy.mockRestore();
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

      await component['loadStartupScript']();
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

      await component['loadStartupScript']();
      await component['executeStartupScript']();
      await component['cleanupStartupScript']();

      // After cleanup, executing again should be a no-op (startupScript is null).
      await component['executeStartupScript']();
      expect(mockInvoke).toHaveBeenCalledTimes(1);
    });

    it('should work when startup script has no cleanup function', async () => {
      const mockInvoke = vi.fn().mockResolvedValue(undefined);

      mockPluginSettingsComponent.settings.getStartupScriptPath.mockReturnValue('startup.ts');
      mockApp.vault.exists.mockResolvedValue(true);
      mockRequireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
        invoke: mockInvoke
      });

      await component['loadStartupScript']();
      await expect(component['cleanupStartupScript']()).resolves.toBeUndefined();
    });
  });

  describe('loadStartupScript', () => {
    it('should return early when startup script path is not configured', async () => {
      mockPluginSettingsComponent.settings.getStartupScriptPath.mockReturnValue('');

      await component['loadStartupScript']();

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
        await component['loadStartupScript']();

        expect(mockRequireHandlerFactoryComponent.requireVaultScriptAsync).not.toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith(`Startup script not found: ${SCRIPT_PATH}`);
      } finally {
        consoleErrorSpy.mockRestore();
      }
    });

    it('should require the script when path is valid', async () => {
      const SCRIPT_PATH = 'startup.ts';
      const mockInvoke = vi.fn().mockResolvedValue(undefined);

      mockPluginSettingsComponent.settings.getStartupScriptPath.mockReturnValue(SCRIPT_PATH);
      mockApp.vault.exists.mockResolvedValue(true);
      mockRequireHandlerFactoryComponent.requireVaultScriptAsync.mockResolvedValue({
        invoke: mockInvoke
      });

      await component['loadStartupScript']();
      await component['executeStartupScript']();

      expect(mockRequireHandlerFactoryComponent.requireVaultScriptAsync).toHaveBeenCalledWith(SCRIPT_PATH);
      expect(mockInvoke).toHaveBeenCalledWith(mockApp);
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

      await component['loadStartupScript']();
      await component['executeStartupScript']();

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
