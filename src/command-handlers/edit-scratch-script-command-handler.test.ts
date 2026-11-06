import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { ScratchScript } from '../vault-scripts/scratch-script.ts';

import { EditScratchScriptCommandHandler } from './edit-scratch-script-command-handler.ts';

vi.mock('@mnaoumov/obsidian-lib/command-handlers/global-command-handler', () => ({
  GlobalCommandHandler: vi.fn()
}));

describe('EditScratchScriptCommandHandler', () => {
  it('should open the scratch script when executed', async () => {
    const partial: Partial<ScratchScript> = {
      edit: vi.fn().mockResolvedValue(undefined)
    };
    const scratchScript = partial as ScratchScript;

    const handler = new EditScratchScriptCommandHandler(scratchScript);
    await handler.execute();

    expect(scratchScript.edit).toHaveBeenCalledOnce();
  });
});
