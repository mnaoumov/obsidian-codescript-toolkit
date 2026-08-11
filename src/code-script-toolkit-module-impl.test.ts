import { castTo } from 'obsidian-dev-utils/object-utils';
import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

// eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
import type { TempPluginClass } from './code-button-context.ts';
// eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
import type { TempPluginRegistryComponent } from './temp-plugin-registry.ts';

import { CodeScriptToolkitModuleImpl } from './code-script-toolkit-module-impl.ts';

vi.mock('./temp-plugin-registry.ts', () => ({
  // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
  TempPluginRegistry: vi.fn()
}));

function createMockRegistry(): TempPluginRegistryComponent {
  const partial: Partial<TempPluginRegistryComponent> = {
    // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
    getTempPlugin: vi.fn(),
    // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
    registerTempPlugin: vi.fn(),
    // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
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
      // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
      await registerTempPlugin({ tempPluginClass: mockClass });

      // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
      expect(mockRegistry.registerTempPlugin).toHaveBeenCalledWith({ tempPluginClass: mockClass });
    });

    it('should call registerTempPlugin on registry with cssText when provided', async () => {
      const mockRegistry = createMockRegistry();
      const impl = new CodeScriptToolkitModuleImpl(mockRegistry);
      const mockClass = vi.fn() as TempPluginClass;
      const cssText = '.foo { color: red; }';

      await impl.registerTempPlugin({
        cssText,
        // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
        tempPluginClass: mockClass
      });

      expect(mockRegistry.registerTempPlugin).toHaveBeenCalledWith({
        cssText,
        // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
        tempPluginClass: mockClass
      });
    });

    it('should call registerTempPlugin on registry without cssText when not provided', async () => {
      const mockRegistry = createMockRegistry();
      const impl = new CodeScriptToolkitModuleImpl(mockRegistry);
      const mockClass = vi.fn() as TempPluginClass;

      await impl.registerTempPlugin({
        // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
        tempPluginClass: mockClass
      });

      expect(mockRegistry.registerTempPlugin).toHaveBeenCalledWith({
        // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
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
