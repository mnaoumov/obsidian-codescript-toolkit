import type { App } from 'obsidian';

import { castTo } from '@mnaoumov/typescript-lib/object-utils';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type { PluginSettingsComponent } from '../settings/plugin-settings-component.ts';

import { InvocableScriptsFolderTrust } from './invocable-scripts-folder-trust.ts';
import { TRUSTED_INVOCABLE_SCRIPTS_FOLDER_KEY } from './trusted-invocable-scripts-folder-key.ts';

const mockConfirm = vi.fn();

vi.mock('@mnaoumov/obsidian-lib/modals/confirm', () => ({
  confirm: (...$arguments: unknown[]): unknown => mockConfirm(...$arguments)
}));

const FOLDER = 'root/scripts';

describe('InvocableScriptsFolderTrust', () => {
  let storage: Map<string, unknown>;
  let folder: string;
  let trust: InvocableScriptsFolderTrust;

  beforeEach(() => {
    mockConfirm.mockReset().mockResolvedValue(false);
    storage = new Map<string>();
    folder = FOLDER;

    const app = castTo<App>({
      loadLocalStorage: (key: string): unknown => storage.get(key) ?? null,
      saveLocalStorage: (key: string, data: unknown): void => {
        if (data === null) {
          storage.delete(key);
        } else {
          storage.set(key, data);
        }
      }
    });

    trust = new InvocableScriptsFolderTrust({
      app,
      pluginSettingsComponent: castTo<PluginSettingsComponent>({
        settings: { getInvocableScriptsFolder: (): string => folder }
      })
    });
  });

  it('should not trust a folder by default', () => {
    expect(trust.isTrusted()).toBe(false);
  });

  it('should store the folder path, not a flag', () => {
    trust.trust();

    expect(storage.get(TRUSTED_INVOCABLE_SCRIPTS_FOLDER_KEY)).toBe(FOLDER);
    expect(trust.isTrusted()).toBe(true);
  });

  it('should treat another folder as untrusted', () => {
    trust.trust();
    folder = 'other/scripts';

    expect(trust.isTrusted()).toBe(false);
  });

  it('should never trust an empty folder setting', () => {
    folder = '';
    trust.trust();

    expect(storage.size).toBe(0);
    expect(trust.isTrusted()).toBe(false);
  });

  it('should revoke the trust', () => {
    trust.trust();
    trust.revoke();

    expect(trust.isTrusted()).toBe(false);
  });

  it('should trust the folder when the user agrees', async () => {
    mockConfirm.mockResolvedValue(true);

    expect(await trust.promptForTrust()).toBe(true);
    expect(trust.isTrusted()).toBe(true);
  });

  it('should leave the folder untrusted when the user declines', async () => {
    expect(await trust.promptForTrust()).toBe(false);
    expect(trust.isTrusted()).toBe(false);
  });

  it('should not prompt for a folder that is already trusted', async () => {
    trust.trust();

    expect(await trust.promptForTrust()).toBe(true);
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  it('should not prompt when no folder is configured', async () => {
    folder = '';

    expect(await trust.promptForTrust()).toBe(false);
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  it('should prompt automatically once per folder per session', async () => {
    expect(trust.shouldPromptAutomatically()).toBe(true);

    await trust.promptForTrust();

    expect(trust.shouldPromptAutomatically()).toBe(false);

    folder = 'other/scripts';
    expect(trust.shouldPromptAutomatically()).toBe(true);
  });

  it('should not prompt automatically for a trusted folder', () => {
    trust.trust();

    expect(trust.shouldPromptAutomatically()).toBe(false);
  });
});
