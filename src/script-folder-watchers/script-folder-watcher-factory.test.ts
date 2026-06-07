import { Platform } from 'obsidian';
import { noopAsync } from 'obsidian-dev-utils/function';
import { castTo } from 'obsidian-dev-utils/object-utils';
import {
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
}

class MockDesktopWatcher extends MockWatcher {}
class MockMobileWatcher extends MockWatcher {}

const mockAddChild = vi.fn((child: unknown) => child);

vi.mock('obsidian-dev-utils/obsidian/components/component-ex', () => ({
  ComponentEx: class MockComponentEx {
    public addChild = mockAddChild;

    public async loadWithPromises(): Promise<void> {
      await this.onloadAsync();
    }

    public onloadAsync(): Promise<void> {
      return noopAsync();
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
  ScriptFolderWatcherDesktopComponent: MockDesktopWatcher
}));

vi.mock('./script-folder-watcher-mobile.ts', () => ({
  ScriptFolderWatcherMobileComponent: MockMobileWatcher
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
  let factory: ScriptFolderWatcherFactoryComponent;
  let mockParams: ScriptFolderWatcherComponentBaseConstructorParams;

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

    mockParams = castTo<ScriptFolderWatcherComponentBaseConstructorParams>({
      app: {},
      pluginSettingsComponent: {},
      scriptManager: {}
    });

    factory = new ScriptFolderWatcherFactoryComponent(mockParams);
  });

  describe('onload', () => {
    it('should create desktop watcher when not mobile and not emulating', async () => {
      await factory.loadWithPromises();
      expect(mockAddChild).toHaveBeenCalledOnce();
      expect(MockWatcher.lastInstance).toBeInstanceOf(MockDesktopWatcher);
    });

    it('should create mobile watcher when Platform.isMobile is true', async () => {
      (Platform as MutablePlatform).isMobile = true;
      await factory.loadWithPromises();
      expect(mockAddChild).toHaveBeenCalledOnce();
      expect(MockWatcher.lastInstance).toBeInstanceOf(MockMobileWatcher);
    });

    it('should create mobile watcher when emulate-mobile class is present', async () => {
      // eslint-disable-next-line obsidianmd/prefer-active-doc -- We need main document for body class check in tests.
      document.body.classList.add('emulate-mobile');
      await factory.loadWithPromises();
      expect(mockAddChild).toHaveBeenCalledOnce();
      expect(MockWatcher.lastInstance).toBeInstanceOf(MockMobileWatcher);
    });

    it('should create mobile watcher when both emulate-mobile and isMobile are true', async () => {
      // eslint-disable-next-line obsidianmd/prefer-active-doc -- We need main document for body class check in tests.
      document.body.classList.add('emulate-mobile');
      (Platform as MutablePlatform).isMobile = true;
      await factory.loadWithPromises();
      expect(mockAddChild).toHaveBeenCalledOnce();
      expect(MockWatcher.lastInstance).toBeInstanceOf(MockMobileWatcher);
    });
  });

  describe('platformScriptFolderWatcher', () => {
    it('should return the created watcher after onload', async () => {
      await factory.loadWithPromises();
      expect(factory.platformScriptFolderWatcher).toBe(MockWatcher.lastInstance);
    });

    it('should throw if accessed before onload', () => {
      expect(() => factory.platformScriptFolderWatcher).toThrow();
    });
  });
});
