import { Platform } from 'obsidian';
import { noop } from 'obsidian-dev-utils/function';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { ScriptFolderWatcherConstructorParams } from './script-folder-watcher.ts';

import { ScriptFolderWatcherFactory } from './script-folder-watcher-factory.ts';

class MockWatcher {
  public static lastInstance: MockWatcher | null = null;
  public params: ScriptFolderWatcherConstructorParams;

  public constructor(params: ScriptFolderWatcherConstructorParams) {
    this.params = params;
    MockWatcher.lastInstance = this;
  }
}

class MockDesktopWatcher extends MockWatcher {}
class MockMobileWatcher extends MockWatcher {}

const mockAddChild = vi.fn((child: unknown) => child);

vi.mock('obsidian-dev-utils/obsidian/components/async-component', () => ({
  AsyncComponentBase: class MockAsyncComponentBase {
    public addChild = mockAddChild;

    public onload(): void {
      noop();
    }
  }
}));

vi.mock('obsidian-dev-utils/type-guards', () => ({
  ensureNonNullable: <T>(value: T | undefined): T => {
    if (value === undefined || value === null) {
      throw new Error('Value is null or undefined');
    }
    return value;
  }
}));

vi.mock('./script-folder-watcher-desktop.ts', () => ({
  ScriptFolderWatcherDesktop: MockDesktopWatcher
}));

vi.mock('./script-folder-watcher-mobile.ts', () => ({
  ScriptFolderWatcherMobile: MockMobileWatcher
}));

vi.mock('obsidian', async (importOriginal) => ({
  ...await importOriginal<typeof import('obsidian')>(),
  Platform: {
    isMobile: false
  }
}));

interface MutablePlatform {
  isMobile: boolean;
}

describe('ScriptFolderWatcherFactory', () => {
  let factory: ScriptFolderWatcherFactory;
  let mockParams: ScriptFolderWatcherConstructorParams;

  beforeEach(() => {
    vi.clearAllMocks();
    (Platform as MutablePlatform).isMobile = false;
    // eslint-disable-next-line obsidianmd/prefer-active-doc -- We need main document for body class check in tests.
    document.body.classList.remove('emulate-mobile');
    // eslint-disable-next-line obsidianmd/prefer-active-doc -- We need main document for body class check in tests.
    document.body.hasClass = function hasClass(cls: string): boolean {
      return this.classList.contains(cls);
    };
    MockWatcher.lastInstance = null;

    mockParams = {
      app: {} as never,
      pluginSettingsComponent: {} as never,
      scriptManager: {} as never
    };

    factory = new ScriptFolderWatcherFactory(mockParams);
  });

  describe('onload', () => {
    it('should create desktop watcher when not mobile and not emulating', async () => {
      await factory.onload();
      expect(mockAddChild).toHaveBeenCalledOnce();
      expect(MockWatcher.lastInstance).toBeInstanceOf(MockDesktopWatcher);
    });

    it('should create mobile watcher when Platform.isMobile is true', async () => {
      (Platform as MutablePlatform).isMobile = true;
      await factory.onload();
      expect(mockAddChild).toHaveBeenCalledOnce();
      expect(MockWatcher.lastInstance).toBeInstanceOf(MockMobileWatcher);
    });

    it('should create mobile watcher when emulate-mobile class is present', async () => {
      // eslint-disable-next-line obsidianmd/prefer-active-doc -- We need main document for body class check in tests.
      document.body.classList.add('emulate-mobile');
      await factory.onload();
      expect(mockAddChild).toHaveBeenCalledOnce();
      expect(MockWatcher.lastInstance).toBeInstanceOf(MockMobileWatcher);
    });

    it('should create mobile watcher when both emulate-mobile and isMobile are true', async () => {
      // eslint-disable-next-line obsidianmd/prefer-active-doc -- We need main document for body class check in tests.
      document.body.classList.add('emulate-mobile');
      (Platform as MutablePlatform).isMobile = true;
      await factory.onload();
      expect(mockAddChild).toHaveBeenCalledOnce();
      expect(MockWatcher.lastInstance).toBeInstanceOf(MockMobileWatcher);
    });
  });

  describe('platformScriptFolderWatcher', () => {
    it('should return the created watcher after onload', async () => {
      await factory.onload();
      expect(factory.platformScriptFolderWatcher).toBe(MockWatcher.lastInstance);
    });

    it('should throw if accessed before onload', () => {
      expect(() => factory.platformScriptFolderWatcher).toThrow();
    });
  });
});
