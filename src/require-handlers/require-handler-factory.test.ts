import {
  Component,
  Platform
} from 'obsidian';
import { castTo } from 'obsidian-dev-utils/object-utils';
import { ComponentEx } from 'obsidian-dev-utils/obsidian/components/component-ex';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { RequireHandlerConstructorParams } from './require-handler.ts';

import { RequireHandlerFactoryComponent } from './require-handler-factory.ts';

const mockClearCache = vi.fn();
const mockRequireAsync = vi.fn();
const mockRequireStringAsync = vi.fn();
const mockRequireVaultScriptAsync = vi.fn();

interface MockIsMobile {
  isMobile: boolean;
}

// Stub for the plugin's own sibling platform-handler modules. Extends the real
// Test-mock `Component` so the real `ComponentEx.addChild` can eager-load it
// Through the genuine load lifecycle (no hand-rolled `load`).
class MockRequireHandlerComponent extends Component {
  public clearCache = mockClearCache;
  public requireAsync = mockRequireAsync;
  public requireStringAsync = mockRequireStringAsync;
  public requireVaultScriptAsync = mockRequireVaultScriptAsync;
}

vi.mock('./require-handler-emulate-mobile.ts', () => ({
  RequireHandlerEmulateMobileComponent: MockRequireHandlerComponent
}));

vi.mock('./require-handler-mobile.ts', () => ({
  RequireHandlerMobileComponent: MockRequireHandlerComponent
}));

vi.mock('./require-handler-desktop.ts', () => ({
  RequireHandlerDesktopComponent: MockRequireHandlerComponent
}));

vi.mock('obsidian', async (importOriginal) => ({
  ...await importOriginal<typeof import('obsidian')>(),
  Platform: {
    isMobile: false
  }
}));

describe('RequireHandlerFactoryComponent', () => {
  let factory: RequireHandlerFactoryComponent;
  let mockParams: RequireHandlerConstructorParams;

  beforeEach(() => {
    vi.clearAllMocks();
    (Platform as MockIsMobile).isMobile = false;
    activeDocument.body.classList.remove('emulate-mobile');
    activeDocument.body.hasClass = function hasClass(cls: string): boolean {
      return this.classList.contains(cls);
    };

    mockParams = castTo<RequireHandlerConstructorParams>({
      app: {},
      consoleDebugComponent: {},
      pluginRequire: vi.fn(),
      pluginSettingsComponent: {},
      tempPluginRegistry: {}
    });

    factory = new RequireHandlerFactoryComponent(mockParams);
  });

  describe('onload', () => {
    it('should create desktop handler when not mobile and not emulating mobile', async () => {
      const addChildSpy = vi.spyOn(ComponentEx.prototype, 'addChild');
      await factory.loadWithPromises();
      expect(addChildSpy).toHaveBeenCalledOnce();
      expect(addChildSpy.mock.calls[0]?.[0]).toBeInstanceOf(MockRequireHandlerComponent);
    });

    it('should create mobile handler when Platform.isMobile is true', async () => {
      (Platform as MockIsMobile).isMobile = true;
      const addChildSpy = vi.spyOn(ComponentEx.prototype, 'addChild');
      await factory.loadWithPromises();
      expect(addChildSpy).toHaveBeenCalledOnce();
      expect(addChildSpy.mock.calls[0]?.[0]).toBeInstanceOf(MockRequireHandlerComponent);
    });

    it('should create emulate-mobile handler when body has emulate-mobile class', async () => {
      activeDocument.body.classList.add('emulate-mobile');
      const addChildSpy = vi.spyOn(ComponentEx.prototype, 'addChild');
      await factory.loadWithPromises();
      expect(addChildSpy).toHaveBeenCalledOnce();
      expect(addChildSpy.mock.calls[0]?.[0]).toBeInstanceOf(MockRequireHandlerComponent);
    });

    it('should prefer emulate-mobile over mobile when both conditions are true', async () => {
      activeDocument.body.classList.add('emulate-mobile');
      (Platform as MockIsMobile).isMobile = true;
      const addChildSpy = vi.spyOn(ComponentEx.prototype, 'addChild');
      await factory.loadWithPromises();
      expect(addChildSpy).toHaveBeenCalledOnce();
      expect(addChildSpy.mock.calls[0]?.[0]).toBeInstanceOf(MockRequireHandlerComponent);
    });
  });

  describe('clearCache', () => {
    it('should delegate clearCache to the platform handler', async () => {
      await factory.loadWithPromises();
      factory.clearCache();
      expect(mockClearCache).toHaveBeenCalledOnce();
    });

    it('should throw if called before onload', () => {
      expect(() => {
        factory.clearCache();
      }).toThrow();
    });
  });

  describe('requireAsync', () => {
    it('should delegate requireAsync to the platform handler', async () => {
      const expectedResult = { foo: 'bar' };
      mockRequireAsync.mockResolvedValue(expectedResult);
      await factory.loadWithPromises();
      const result = await factory.requireAsync('test-id', {});
      expect(mockRequireAsync).toHaveBeenCalledWith('test-id', {});
      expect(result).toBe(expectedResult);
    });
  });

  describe('requireStringAsync', () => {
    it('should delegate requireStringAsync to the platform handler', async () => {
      const expectedResult = { exported: true };
      mockRequireStringAsync.mockResolvedValue(expectedResult);
      await factory.loadWithPromises();
      const params = { code: 'console.log("hi")', path: 'test.ts' };
      const result = await factory.requireStringAsync(params);
      expect(mockRequireStringAsync).toHaveBeenCalledWith(params);
      expect(result).toBe(expectedResult);
    });
  });

  describe('requireVaultScriptAsync', () => {
    it('should delegate requireVaultScriptAsync to the platform handler', async () => {
      const expectedResult = { script: true };
      mockRequireVaultScriptAsync.mockResolvedValue(expectedResult);
      await factory.loadWithPromises();
      const result = await factory.requireVaultScriptAsync('my-script');
      expect(mockRequireVaultScriptAsync).toHaveBeenCalledWith('my-script');
      expect(result).toBe(expectedResult);
    });
  });
});
