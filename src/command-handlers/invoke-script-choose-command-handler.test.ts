import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { ScriptManager } from '../script.ts';

import { InvokeScriptChooseCommandHandler } from './invoke-script-choose-command-handler.ts';

vi.mock('obsidian-dev-utils/obsidian/command-handlers/global-command-handler', () => ({
  GlobalCommandHandler: vi.fn()
}));

describe('InvokeScriptChooseCommandHandler', () => {
  it('should call selectAndInvokeScript on the scriptManager when executed', async () => {
    const partial: Partial<ScriptManager> = {
      selectAndInvokeScript: vi.fn().mockResolvedValue(undefined)
    };
    const mockScriptManager = partial as ScriptManager;

    const handler = new InvokeScriptChooseCommandHandler(mockScriptManager);
    await handler['execute']();

    expect(mockScriptManager.selectAndInvokeScript).toHaveBeenCalledOnce();
  });
});
