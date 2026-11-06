import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { ScratchScript } from '../vault-scripts/scratch-script.ts';

import { RunScratchScriptCommandHandler } from './run-scratch-script-command-handler.ts';

vi.mock('@mnaoumov/obsidian-lib/command-handlers/global-command-handler', () => ({
  GlobalCommandHandler: vi.fn()
}));

describe('RunScratchScriptCommandHandler', () => {
  it('should run the scratch script when executed', async () => {
    const partial: Partial<ScratchScript> = {
      run: vi.fn().mockResolvedValue(undefined)
    };
    const scratchScript = partial as ScratchScript;

    const handler = new RunScratchScriptCommandHandler(scratchScript);
    await handler.execute();

    expect(scratchScript.run).toHaveBeenCalledOnce();
  });
});
