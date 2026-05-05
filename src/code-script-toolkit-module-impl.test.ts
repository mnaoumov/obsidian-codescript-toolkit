import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { TempPluginClass } from './code-button-context.ts';
import type { TempPluginRegistry } from './temp-plugin-registry.ts';

import { CodeScriptToolkitModuleImpl } from './code-script-toolkit-module-impl.ts';

vi.mock('./temp-plugin-registry.ts', () => ({
  TempPluginRegistry: vi.fn()
}));

function createMockRegistry(): TempPluginRegistry {
  const partial: Partial<TempPluginRegistry> = {
    registerTempPlugin: vi.fn(),
    unregisterTempPlugin: vi.fn()
  };
  return partial as TempPluginRegistry;
}

describe('CodeScriptToolkitModuleImpl', () => {
  describe('registerTempPlugin', () => {
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

    it('should default cssText to empty string when not provided', async () => {
      const mockRegistry = createMockRegistry();
      const impl = new CodeScriptToolkitModuleImpl(mockRegistry);
      const mockClass = vi.fn() as TempPluginClass;

      await impl.registerTempPlugin({
        tempPluginClass: mockClass
      });

      expect(mockRegistry.registerTempPlugin).toHaveBeenCalledWith({
        cssText: '',
        tempPluginClass: mockClass
      });
    });
  });

  describe('unregisterTempPlugin', () => {
    it('should call unregisterTempPlugin on registry with class name', () => {
      const mockRegistry = createMockRegistry();
      const impl = new CodeScriptToolkitModuleImpl(mockRegistry);
      const className = 'MyTempPlugin';

      impl.unregisterTempPlugin(className);

      expect(mockRegistry.unregisterTempPlugin).toHaveBeenCalledWith(className);
    });
  });
});
