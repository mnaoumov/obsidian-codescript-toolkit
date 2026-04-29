import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { TempPluginRegistry } from '../temp-plugin-registry.ts';

import { UnloadTempPluginsCommandHandler } from './unload-temp-plugins-command-handler.ts';

vi.mock('obsidian-dev-utils/obsidian/command-handlers/global-command-handler', () => ({
  GlobalCommandHandler: vi.fn()
}));

describe('UnloadTempPluginsCommandHandler', () => {
  it('should call unloadTempPlugins on the tempPluginRegistry when executed', () => {
    const partial: Partial<TempPluginRegistry> = {
      unloadTempPlugins: vi.fn()
    };
    const mockRegistry = partial as TempPluginRegistry;

    const handler = new UnloadTempPluginsCommandHandler(mockRegistry);
    handler.execute();

    expect(mockRegistry.unloadTempPlugins).toHaveBeenCalledOnce();
  });
});
