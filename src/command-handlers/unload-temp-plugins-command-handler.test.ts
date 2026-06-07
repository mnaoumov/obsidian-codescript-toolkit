import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { TempPluginRegistryComponent } from '../temp-plugin-registry.ts';

import { UnloadTempPluginsCommandHandler } from './unload-temp-plugins-command-handler.ts';

vi.mock('obsidian-dev-utils/obsidian/command-handlers/global-command-handler', () => ({
  GlobalCommandHandler: vi.fn()
}));

describe('UnloadTempPluginsCommandHandler', () => {
  it('should call unloadTempPlugins on the tempPluginRegistry when executed', () => {
    const partial: Partial<TempPluginRegistryComponent> = {
      unloadTempPlugins: vi.fn()
    };
    const mockRegistry = partial as TempPluginRegistryComponent;

    const handler = new UnloadTempPluginsCommandHandler(mockRegistry);
    handler.execute();

    expect(mockRegistry.unloadTempPlugins).toHaveBeenCalledOnce();
  });
});
