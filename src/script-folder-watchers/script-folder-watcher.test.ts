import type { App } from 'obsidian';
import type { PluginNoticeComponent } from 'obsidian-dev-utils/obsidian/components/plugin-notice-component';
import type { Promisable } from 'type-fest';
import type { Mock } from 'vitest';

import { AsyncEvents } from 'obsidian-dev-utils/async-events';
import { castTo } from 'obsidian-dev-utils/object-utils';
import { strictProxy } from 'obsidian-dev-utils/strict-proxy';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { PluginSettingsComponent } from '../plugin-settings-component.ts';
import type { ScriptManager } from '../script.ts';

import { ScriptFolderWatcherComponentBase } from './script-folder-watcher.ts';

class TestScriptFolderWatcherComponent extends ScriptFolderWatcherComponentBase {
  public startWatcherMock = vi.fn<(onChange: () => Promise<void>) => Promisable<boolean>>().mockResolvedValue(false);
  public stopWatcherMock = vi.fn();

  protected override startWatcher(onChange: () => Promise<void>): Promisable<boolean> {
    return this.startWatcherMock(onChange);
  }

  protected override stopWatcher(): void {
    this.stopWatcherMock();
  }
}

describe('ScriptFolderWatcher', () => {
  let watcher: TestScriptFolderWatcherComponent;
  let app: App;
  let pluginSettingsEvents: AsyncEvents;
  let pluginNoticeComponent: PluginNoticeComponent;
  let pluginSettingsComponent: PluginSettingsComponent;
  let scriptManager: ScriptManager;
  let registerInvocableScriptsMock: Mock<() => Promise<void>>;

  beforeEach(() => {
    app = strictProxy<App>({});

    pluginNoticeComponent = strictProxy<PluginNoticeComponent>({});

    pluginSettingsEvents = new AsyncEvents();
    pluginSettingsComponent = strictProxy<PluginSettingsComponent>({
      // The SUT registers no-arg-bound handlers; delegate to a real AsyncEvents so registration and teardown run for real.
      on: castTo<PluginSettingsComponent['on']>((...args: Parameters<AsyncEvents['on']>) => pluginSettingsEvents.on(...args))
    });

    registerInvocableScriptsMock = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    scriptManager = strictProxy<ScriptManager>({
      registerInvocableScripts: registerInvocableScriptsMock
    });

    watcher = new TestScriptFolderWatcherComponent({
      app,
      pluginNoticeComponent,
      pluginSettingsComponent,
      scriptManager
    });
  });

  describe('constructor', () => {
    it('should assign app from params', () => {
      expect(watcher['app']).toBe(app);
    });

    it('should assign pluginSettingsComponent from params', () => {
      expect(watcher['pluginSettingsComponent']).toBe(pluginSettingsComponent);
    });
  });

  describe('onload', () => {
    it('should apply the new settings during load', async () => {
      await watcher.loadWithPromises();

      expect(watcher.startWatcherMock).toHaveBeenCalledOnce();
    });

    it('should register a listener for the loadSettings event', async () => {
      const onSpy = vi.spyOn(pluginSettingsEvents, 'on');
      await watcher.loadWithPromises();

      expect(onSpy).toHaveBeenCalledWith('loadSettings', expect.any(Function));
    });

    it('should register a listener for the saveSettings event', async () => {
      const onSpy = vi.spyOn(pluginSettingsEvents, 'on');
      await watcher.loadWithPromises();

      expect(onSpy).toHaveBeenCalledWith('saveSettings', expect.any(Function));
    });

    it('should unregister the event listeners on unload', async () => {
      const offrefSpy = vi.spyOn(pluginSettingsEvents, 'offref');
      await watcher.loadWithPromises();

      watcher.unload();

      const EVENT_COUNT = 2;
      expect(offrefSpy).toHaveBeenCalledTimes(EVENT_COUNT);
    });
  });

  describe('register2', () => {
    it('should call stopWatcher before starting', async () => {
      const onChange = vi.fn().mockResolvedValue(undefined);
      await watcher['register2'](onChange);

      expect(watcher.stopWatcherMock).toHaveBeenCalled();
    });

    it('should call startWatcher with onChange', async () => {
      const onChange = vi.fn().mockResolvedValue(undefined);
      await watcher['register2'](onChange);

      expect(watcher.startWatcherMock).toHaveBeenCalledWith(onChange);
    });

    it('should call onChange when startWatcher returns true', async () => {
      watcher.startWatcherMock.mockResolvedValue(true);
      const onChange = vi.fn().mockResolvedValue(undefined);
      await watcher['register2'](onChange);

      expect(onChange).toHaveBeenCalledOnce();
    });

    it('should not call onChange when startWatcher returns false', async () => {
      watcher.startWatcherMock.mockResolvedValue(false);
      const onChange = vi.fn().mockResolvedValue(undefined);
      await watcher['register2'](onChange);

      expect(onChange).not.toHaveBeenCalled();
    });

    it('should register stopWatcher as cleanup on first call', async () => {
      const registerSpy = vi.spyOn(watcher, 'register');
      const onChange = vi.fn().mockResolvedValue(undefined);
      await watcher['register2'](onChange);

      // Initial cleanup + post-start cleanup both registered on the first call.
      const EXPECTED_REGISTRATIONS = 2;
      expect(registerSpy).toHaveBeenCalledTimes(EXPECTED_REGISTRATIONS);
    });

    it('should not re-register initial cleanup on subsequent calls', async () => {
      const onChange = vi.fn().mockResolvedValue(undefined);
      await watcher['register2'](onChange);

      const registerSpy = vi.spyOn(watcher, 'register');
      await watcher['register2'](onChange);

      // Only the post-start cleanup should be registered on the second call.
      const EXPECTED_POST_START_REGISTRATIONS = 1;
      expect(registerSpy).toHaveBeenCalledTimes(EXPECTED_POST_START_REGISTRATIONS);
    });

    it('should run the registered stopWatcher cleanups on unload', async () => {
      await watcher.loadWithPromises();

      watcher.stopWatcherMock.mockClear();
      watcher.unload();

      // The cleanups registered during register2 invoke stopWatcher when the component unloads.
      expect(watcher.stopWatcherMock).toHaveBeenCalled();
    });
  });

  describe('applyNewSettings', () => {
    it('should call register2 with registerInvocableScripts when loadSettings event fires', async () => {
      await watcher.loadWithPromises();
      watcher.startWatcherMock.mockClear();

      await pluginSettingsEvents.triggerAsync('loadSettings');

      expect(watcher.startWatcherMock).toHaveBeenCalled();
    });

    it('should call register2 with registerInvocableScripts when saveSettings event fires', async () => {
      watcher.startWatcherMock.mockResolvedValue(true);
      await watcher.loadWithPromises();
      registerInvocableScriptsMock.mockClear();

      await pluginSettingsEvents.triggerAsync('saveSettings');

      expect(watcher.startWatcherMock).toHaveBeenCalled();
      expect(registerInvocableScriptsMock).toHaveBeenCalled();
    });
  });
});
