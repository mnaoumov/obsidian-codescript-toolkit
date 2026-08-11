// eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
import type { Plugin as ObsidianPlugin } from 'obsidian';

import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { UnloadTempPluginCommandHandler as UnloadTemporaryPluginCommandHandler } from './unload-temp-plugin-command-handler.ts';

vi.mock('obsidian-dev-utils/obsidian/command-handlers/global-command-handler', () => ({
  GlobalCommandHandler: vi.fn()
}));

const TEST_CLASS_NAME = 'MyTempPlugin';

describe('UnloadTempPluginCommandHandler', () => {
  it('should call unload on the tempPlugin when executed', () => {
    const partial: Partial<ObsidianPlugin> = {
      unload: vi.fn()
    };
    const mockPlugin = partial as ObsidianPlugin;

    const handler = new UnloadTemporaryPluginCommandHandler({
      // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
      tempPlugin: mockPlugin,
      // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/42 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
      tempPluginClassName: TEST_CLASS_NAME
    });
    handler.execute();

    expect(mockPlugin.unload).toHaveBeenCalledOnce();
  });
});
