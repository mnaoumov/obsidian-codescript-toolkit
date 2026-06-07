import { castTo } from 'obsidian-dev-utils/object-utils';
import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { TempPluginClass } from './code-button-context.ts';
import type { TempPluginRegistryComponent } from './temp-plugin-registry.ts';

import { CodeScriptToolkitModuleImpl } from './code-script-toolkit-module-impl.ts';

vi.mock('./temp-plugin-registry.ts', () => ({
  TempPluginRegistry: vi.fn()
}));

function createMockRegistry(): TempPluginRegistryComponent {
  const partial: Partial<TempPluginRegistryComponent> = {
    getTempPlugin: vi.fn(),
    registerTempPlugin: vi.fn(),
    unregisterTempPlugin: vi.fn()
  };
  return partial as TempPluginRegistryComponent;
}

describe('CodeScriptToolkitModuleImpl', () => {
  describe('getTempPlugin', () => {
    it('should work when destructured and called unbound', () => {
      const mockRegistry = createMockRegistry();
      const impl = new CodeScriptToolkitModuleImpl(mockRegistry);
      const mockPlugin = castTo<import('obsidian').Plugin>({ id: 'test' });
      vi.mocked(mockRegistry.getTempPlugin).mockReturnValue(mockPlugin);

      const { getTempPlugin } = impl;
      const result = getTempPlugin('TestPlugin');

      expect(mockRegistry.getTempPlugin).toHaveBeenCalledWith('TestPlugin');
      expect(result).toBe(mockPlugin);
    });

    it('should delegate to registry.getTempPlugin with string', () => {
      const mockRegistry = createMockRegistry();
      const impl = new CodeScriptToolkitModuleImpl(mockRegistry);
      const mockPlugin = castTo<import('obsidian').Plugin>({ id: 'test' });
      vi.mocked(mockRegistry.getTempPlugin).mockReturnValue(mockPlugin);

      const result = impl.getTempPlugin('TestPlugin');

      expect(mockRegistry.getTempPlugin).toHaveBeenCalledWith('TestPlugin');
      expect(result).toBe(mockPlugin);
    });

    it('should delegate to registry.getTempPlugin with class', () => {
      const mockRegistry = createMockRegistry();
      const impl = new CodeScriptToolkitModuleImpl(mockRegistry);
      const mockClass = vi.fn() as TempPluginClass;

      impl.getTempPlugin(mockClass);

      expect(mockRegistry.getTempPlugin).toHaveBeenCalledWith(mockClass);
    });
  });

  describe('registerTempPlugin', () => {
    it('should work when destructured and called unbound', async () => {
      const mockRegistry = createMockRegistry();
      const impl = new CodeScriptToolkitModuleImpl(mockRegistry);
      const mockClass = vi.fn() as TempPluginClass;

      const { registerTempPlugin } = impl;
      await registerTempPlugin({ tempPluginClass: mockClass });

      expect(mockRegistry.registerTempPlugin).toHaveBeenCalledWith({ tempPluginClass: mockClass });
    });

    it('should call registerTempPlugin on registry with cssText when provided', async () => {
      const mockRegistry = createMockRegistry();
      const impl = new CodeScriptToolkitModuleImpl(mockRegistry);
      const mockClass = vi.fn() as TempPluginClass;
      const cssText = '.foo { color: red; }';

      await impl.registerTempPlugin({
        cssText,
        tempPluginClass: mockClass
      });

      expect(mockRegistry.registerTempPlugin).toHaveBeenCalledWith({
        cssText,
        tempPluginClass: mockClass
      });
    });

    it('should call registerTempPlugin on registry without cssText when not provided', async () => {
      const mockRegistry = createMockRegistry();
      const impl = new CodeScriptToolkitModuleImpl(mockRegistry);
      const mockClass = vi.fn() as TempPluginClass;

      await impl.registerTempPlugin({
        tempPluginClass: mockClass
      });

      expect(mockRegistry.registerTempPlugin).toHaveBeenCalledWith({
        tempPluginClass: mockClass
      });
    });
  });

  describe('unregisterTempPlugin', () => {
    it('should work when destructured and called unbound', () => {
      const mockRegistry = createMockRegistry();
      const impl = new CodeScriptToolkitModuleImpl(mockRegistry);
      const mockClass = vi.fn() as TempPluginClass;

      const { unregisterTempPlugin } = impl;
      unregisterTempPlugin(mockClass);

      expect(mockRegistry.unregisterTempPlugin).toHaveBeenCalledWith(mockClass);
    });

    it('should call unregisterTempPlugin on registry with class name', () => {
      const mockRegistry = createMockRegistry();
      const impl = new CodeScriptToolkitModuleImpl(mockRegistry);
      const className = 'MyTempPlugin';

      impl.unregisterTempPlugin(className);

      expect(mockRegistry.unregisterTempPlugin).toHaveBeenCalledWith(className);
    });

    it('should call unregisterTempPlugin on registry with class', () => {
      const mockRegistry = createMockRegistry();
      const impl = new CodeScriptToolkitModuleImpl(mockRegistry);
      const mockClass = vi.fn() as TempPluginClass;

      impl.unregisterTempPlugin(mockClass);

      expect(mockRegistry.unregisterTempPlugin).toHaveBeenCalledWith(mockClass);
    });
  });
});
