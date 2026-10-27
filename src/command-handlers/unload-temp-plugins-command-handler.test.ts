// eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/07 Code buttons in depth/43 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

// eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/07 Code buttons in depth/43 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
import type { TempPluginRegistryComponent } from '../temp-plugins/temporary-plugin-registry.ts';

import { UnloadTempPluginsCommandHandler as UnloadTemporaryPluginsCommandHandler } from './unload-temp-plugins-command-handler.ts';

vi.mock('@mnaoumov/obsidian-lib/command-handlers/global-command-handler', () => ({
  GlobalCommandHandler: vi.fn()
}));

describe('UnloadTempPluginsCommandHandler', () => {
  it('should call unloadTempPlugins on the tempPluginRegistry when executed', () => {
    const partial: Partial<TempPluginRegistryComponent> = {
      // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/07 Code buttons in depth/43 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
      unloadTempPlugins: vi.fn()
    };
    const mockRegistry = partial as TempPluginRegistryComponent;

    const handler = new UnloadTemporaryPluginsCommandHandler(mockRegistry);
    handler.execute();

    expect(mockRegistry.unloadTempPlugins).toHaveBeenCalledOnce();
  });
});
