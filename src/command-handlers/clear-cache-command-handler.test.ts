import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { RequireHandlerFactory } from '../require-handlers/require-handler-factory.ts';

import { ClearCacheCommandHandler } from './clear-cache-command-handler.ts';

vi.mock('obsidian-dev-utils/obsidian/command-handlers/global-command-handler', () => ({
  GlobalCommandHandler: vi.fn()
}));

describe('ClearCacheCommandHandler', () => {
  it('should call clearCache on the requireHandlerFactory when executed', () => {
    const partial: Partial<RequireHandlerFactory> = {
      clearCache: vi.fn()
    };
    const mockFactory = partial as RequireHandlerFactory;

    const handler = new ClearCacheCommandHandler(mockFactory);
    handler.execute();

    expect(mockFactory.clearCache).toHaveBeenCalledOnce();
  });
});
