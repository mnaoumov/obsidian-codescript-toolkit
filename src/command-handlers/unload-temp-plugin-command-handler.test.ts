import type { Plugin as ObsidianPlugin } from 'obsidian';

import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { UnloadTempPluginCommandHandler } from './unload-temp-plugin-command-handler.ts';

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

    const handler = new UnloadTempPluginCommandHandler({
      tempPlugin: mockPlugin,
      tempPluginClassName: TEST_CLASS_NAME
    });
    handler.execute();

    expect(mockPlugin.unload).toHaveBeenCalledOnce();
  });
});
