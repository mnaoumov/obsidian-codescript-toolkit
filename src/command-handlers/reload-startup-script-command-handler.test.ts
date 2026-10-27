import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { StartupScriptComponent } from '../vault-scripts/startup-script.ts';

import { ReloadStartupScriptCommandHandler } from './reload-startup-script-command-handler.ts';

vi.mock('@mnaoumov/obsidian-lib/command-handlers/global-command-handler', () => ({
  GlobalCommandHandler: vi.fn()
}));

describe('ReloadStartupScriptCommandHandler', () => {
  it('should call reloadStartupScript on the startupScriptComponent when executed', async () => {
    const partial: Partial<StartupScriptComponent> = {
      reloadStartupScript: vi.fn().mockResolvedValue(undefined)
    };
    const mockComponent = partial as StartupScriptComponent;

    const handler = new ReloadStartupScriptCommandHandler(mockComponent);
    await handler.execute();

    expect(mockComponent.reloadStartupScript).toHaveBeenCalledOnce();
  });
});
