import { Platform } from 'obsidian';
import { strictProxy } from 'obsidian-dev-utils/strict-proxy';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { ScriptFolderWatcherComponentBaseConstructorParams } from './script-folder-watcher.ts';

import { ScriptFolderWatcherFactoryComponent } from './script-folder-watcher-factory.ts';

class MockWatcher {
  public static lastInstance: MockWatcher | null = null;
  public params: ScriptFolderWatcherComponentBaseConstructorParams;

  public constructor(params: ScriptFolderWatcherComponentBaseConstructorParams) {
    this.params = params;
    MockWatcher.lastInstance = this;
  }

  public load(): void {
    // The real ComponentEx.addChild loads the added child; the stub satisfies that contract.
  }
}

class MockDesktopWatcher extends MockWatcher {}
class MockMobileWatcher extends MockWatcher {}

vi.mock('./script-folder-watcher-desktop.ts', () => ({
  ScriptFolderWatcherDesktopComponent: MockDesktopWatcher
}));

vi.mock('./script-folder-watcher-mobile.ts', () => ({
  ScriptFolderWatcherMobileComponent: MockMobileWatcher
}));

describe('ScriptFolderWatcherFactory', () => {
  let factory: ScriptFolderWatcherFactoryComponent;
  let params: ScriptFolderWatcherComponentBaseConstructorParams;

  beforeEach(() => {
    Platform.isMobile = false;
    // eslint-disable-next-line obsidianmd/prefer-active-doc -- We need main document for body class check in tests.
    document.body.classList.remove('emulate-mobile');
    MockWatcher.lastInstance = null;

    params = strictProxy<ScriptFolderWatcherComponentBaseConstructorParams>({});

    factory = new ScriptFolderWatcherFactoryComponent(params);
  });

  afterEach(() => {
    Platform.isMobile = false;
    // eslint-disable-next-line obsidianmd/prefer-active-doc -- We need main document for body class check in tests.
    document.body.classList.remove('emulate-mobile');
  });

  describe('onload', () => {
    it('should create desktop watcher when not mobile and not emulating', async () => {
      const addChildSpy = vi.spyOn(factory, 'addChild');
      await factory.loadWithPromises();

      expect(addChildSpy).toHaveBeenCalledOnce();
      expect(MockWatcher.lastInstance).toBeInstanceOf(MockDesktopWatcher);
    });

    it('should create mobile watcher when Platform.isMobile is true', async () => {
      Platform.isMobile = true;
      const addChildSpy = vi.spyOn(factory, 'addChild');
      await factory.loadWithPromises();

      expect(addChildSpy).toHaveBeenCalledOnce();
      expect(MockWatcher.lastInstance).toBeInstanceOf(MockMobileWatcher);
    });

    it('should create mobile watcher when emulate-mobile class is present', async () => {
      // eslint-disable-next-line obsidianmd/prefer-active-doc -- We need main document for body class check in tests.
      document.body.classList.add('emulate-mobile');
      const addChildSpy = vi.spyOn(factory, 'addChild');
      await factory.loadWithPromises();

      expect(addChildSpy).toHaveBeenCalledOnce();
      expect(MockWatcher.lastInstance).toBeInstanceOf(MockMobileWatcher);
    });

    it('should create mobile watcher when both emulate-mobile and isMobile are true', async () => {
      // eslint-disable-next-line obsidianmd/prefer-active-doc -- We need main document for body class check in tests.
      document.body.classList.add('emulate-mobile');
      Platform.isMobile = true;
      const addChildSpy = vi.spyOn(factory, 'addChild');
      await factory.loadWithPromises();

      expect(addChildSpy).toHaveBeenCalledOnce();
      expect(MockWatcher.lastInstance).toBeInstanceOf(MockMobileWatcher);
    });
  });

  describe('platformScriptFolderWatcher', () => {
    it('should return the created watcher after onload', async () => {
      await factory.loadWithPromises();

      expect(factory['platformScriptFolderWatcher']).toBe(MockWatcher.lastInstance);
    });

    it('should throw if accessed before onload', () => {
      expect(() => factory['platformScriptFolderWatcher']).toThrow();
    });
  });
});
