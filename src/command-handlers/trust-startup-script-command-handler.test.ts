import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { StartupScriptTrust } from '../vault-scripts/startup-script-trust.ts';

import { TrustStartupScriptCommandHandler } from './trust-startup-script-command-handler.ts';
import { UntrustStartupScriptCommandHandler } from './untrust-startup-script-command-handler.ts';

vi.mock('@mnaoumov/obsidian-lib/command-handlers/global-command-handler', () => ({
  GlobalCommandHandler: vi.fn()
}));

const mockTrust = {
  getPath: vi.fn(),
  isTrusted: vi.fn(),
  promptForTrust: vi.fn(),
  untrust: vi.fn()
};
const mockReloadStartupScript = vi.fn();
const mockStopStartupScript = vi.fn();

describe('startup script trust commands', () => {
  beforeEach(() => {
    mockTrust.getPath.mockReset().mockReturnValue('startup.ts');
    mockTrust.isTrusted.mockReset().mockReturnValue(false);
    mockTrust.promptForTrust.mockReset().mockResolvedValue(false);
    mockTrust.untrust.mockReset();
    mockReloadStartupScript.mockReset().mockResolvedValue(undefined);
    mockStopStartupScript.mockReset().mockResolvedValue(undefined);
  });

  describe('TrustStartupScriptCommandHandler', () => {
    function createHandler(): TrustStartupScriptCommandHandler {
      return new TrustStartupScriptCommandHandler({
        reloadStartupScript: mockReloadStartupScript,
        startupScriptTrust: castTo<StartupScriptTrust>(mockTrust)
      });
    }

    it('should be available only for a configured, untrusted script', () => {
      const handler = createHandler();

      expect(handler.canExecute()).toBe(true);

      mockTrust.isTrusted.mockReturnValue(true);
      expect(handler.canExecute()).toBe(false);

      mockTrust.isTrusted.mockReturnValue(false);
      mockTrust.getPath.mockReturnValue('');
      expect(handler.canExecute()).toBe(false);
    });

    it('should run the script once the user trusts it', async () => {
      mockTrust.promptForTrust.mockResolvedValue(true);

      await createHandler().execute();

      expect(mockReloadStartupScript).toHaveBeenCalledOnce();
    });

    it('should run nothing when the user declines', async () => {
      await createHandler().execute();

      expect(mockTrust.promptForTrust).toHaveBeenCalledOnce();
      expect(mockReloadStartupScript).not.toHaveBeenCalled();
    });
  });

  describe('UntrustStartupScriptCommandHandler', () => {
    function createHandler(): UntrustStartupScriptCommandHandler {
      return new UntrustStartupScriptCommandHandler({
        startupScriptTrust: castTo<StartupScriptTrust>(mockTrust),
        stopStartupScript: mockStopStartupScript
      });
    }

    it('should be available only for a trusted script', () => {
      const handler = createHandler();

      expect(handler.canExecute()).toBe(false);

      mockTrust.isTrusted.mockReturnValue(true);
      expect(handler.canExecute()).toBe(true);
    });

    it('should untrust the script and clean up the running one', async () => {
      await createHandler().execute();

      expect(mockTrust.untrust).toHaveBeenCalledOnce();
      expect(mockStopStartupScript).toHaveBeenCalledOnce();
    });
  });
});
