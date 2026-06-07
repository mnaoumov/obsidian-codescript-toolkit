import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { RequireHandlerFactoryComponent } from '../require-handlers/require-handler-factory.ts';

import { ClearCacheCommandHandler } from './clear-cache-command-handler.ts';

vi.mock('obsidian-dev-utils/obsidian/command-handlers/global-command-handler', () => ({
  GlobalCommandHandler: vi.fn()
}));

describe('ClearCacheCommandHandler', () => {
  it('should call clearCache on the RequireHandlerFactoryComponent when executed', () => {
    const partial: Partial<RequireHandlerFactoryComponent> = {
      clearCache: vi.fn()
    };
    const mockFactory = partial as RequireHandlerFactoryComponent;

    const handler = new ClearCacheCommandHandler(mockFactory);
    handler.execute();

    expect(mockFactory.clearCache).toHaveBeenCalledOnce();
  });
});
