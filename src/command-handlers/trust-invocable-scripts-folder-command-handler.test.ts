import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { InvocableScriptsFolderTrust } from '../vault-scripts/invocable-scripts-folder-trust.ts';

import { TrustInvocableScriptsFolderCommandHandler } from './trust-invocable-scripts-folder-command-handler.ts';
import { UntrustInvocableScriptsFolderCommandHandler } from './untrust-invocable-scripts-folder-command-handler.ts';

vi.mock('@mnaoumov/obsidian-lib/command-handlers/global-command-handler', () => ({
  GlobalCommandHandler: vi.fn()
}));

const mockTrust = {
  getFolder: vi.fn(),
  isTrusted: vi.fn(),
  promptForTrust: vi.fn(),
  untrust: vi.fn()
};
const mockRegisterInvocableScripts = vi.fn();

function createParams(): ConstructorParameters<typeof TrustInvocableScriptsFolderCommandHandler>[0] {
  return {
    invocableScriptsFolderTrust: castTo<InvocableScriptsFolderTrust>(mockTrust),
    registerInvocableScripts: mockRegisterInvocableScripts
  };
}

describe('invocable scripts folder trust commands', () => {
  beforeEach(() => {
    mockTrust.getFolder.mockReset().mockReturnValue('scripts');
    mockTrust.isTrusted.mockReset().mockReturnValue(false);
    mockTrust.promptForTrust.mockReset().mockResolvedValue(false);
    mockTrust.untrust.mockReset();
    mockRegisterInvocableScripts.mockReset().mockResolvedValue(undefined);
  });

  describe('TrustInvocableScriptsFolderCommandHandler', () => {
    it('should be available only for a configured, untrusted folder', () => {
      const handler = new TrustInvocableScriptsFolderCommandHandler(createParams());

      expect(handler.canExecute()).toBe(true);

      mockTrust.isTrusted.mockReturnValue(true);
      expect(handler.canExecute()).toBe(false);

      mockTrust.isTrusted.mockReturnValue(false);
      mockTrust.getFolder.mockReturnValue('');
      expect(handler.canExecute()).toBe(false);
    });

    it('should register the scripts once the user trusts the folder', async () => {
      mockTrust.promptForTrust.mockResolvedValue(true);

      await new TrustInvocableScriptsFolderCommandHandler(createParams()).execute();

      expect(mockRegisterInvocableScripts).toHaveBeenCalledOnce();
    });

    it('should register nothing when the user declines', async () => {
      await new TrustInvocableScriptsFolderCommandHandler(createParams()).execute();

      expect(mockTrust.promptForTrust).toHaveBeenCalledOnce();
      expect(mockRegisterInvocableScripts).not.toHaveBeenCalled();
    });
  });

  describe('UntrustInvocableScriptsFolderCommandHandler', () => {
    it('should be available only for a trusted folder', () => {
      const handler = new UntrustInvocableScriptsFolderCommandHandler(createParams());

      expect(handler.canExecute()).toBe(false);

      mockTrust.isTrusted.mockReturnValue(true);
      expect(handler.canExecute()).toBe(true);
    });

    it('should untrust the folder and re-register, which drops its commands', async () => {
      await new UntrustInvocableScriptsFolderCommandHandler(createParams()).execute();

      expect(mockTrust.untrust).toHaveBeenCalledOnce();
      expect(mockRegisterInvocableScripts).toHaveBeenCalledOnce();
    });
  });
});
