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

  it('should store the folder path in a list, not a flag', () => {
    trust.trust();

    expect(storage.get(TRUSTED_INVOCABLE_SCRIPTS_FOLDER_KEY)).toEqual([FOLDER]);
    expect(trust.isTrusted()).toBe(true);
  });

  it('should treat another folder as untrusted', () => {
    trust.trust();
    folder = 'other/scripts';

    expect(trust.isTrusted()).toBe(false);
  });

  it('should keep every trusted folder, so switching back does not need trust again', () => {
    trust.trust();
    folder = 'other/scripts';
    trust.trust();
    folder = FOLDER;

    expect(trust.isTrusted()).toBe(true);
    expect(trust.getTrustedFolders()).toEqual(['other/scripts', FOLDER]);
  });

  it('should not add a folder twice', () => {
    trust.trust();
    trust.trust();

    expect(trust.getTrustedFolders()).toEqual([FOLDER]);
  });

  it('should trust a folder under a trusted folder without listing it', () => {
    folder = 'root';
    trust.trust();
    folder = FOLDER;

    expect(trust.isTrusted()).toBe(true);
    trust.trust();
    expect(trust.getTrustedFolders()).toEqual(['root']);
  });

  it('should not treat a folder whose name only starts with a trusted one as under it', () => {
    folder = 'root/script';
    trust.trust();
    folder = FOLDER;

    expect(trust.isTrusted()).toBe(false);
  });

  it('should never trust an empty folder setting', () => {
    folder = '';
    trust.trust();

    expect(storage.size).toBe(0);
    expect(trust.isTrusted()).toBe(false);
    expect(trust.isFolderTrusted('')).toBe(false);
  });

  it('should untrust the folder', () => {
    trust.trust();
    trust.untrust();

    expect(trust.isTrusted()).toBe(false);
    expect(storage.has(TRUSTED_INVOCABLE_SCRIPTS_FOLDER_KEY)).toBe(false);
  });

  it('should untrust the folder through its trusted parents too, and keep unrelated folders', () => {
    storage.set(TRUSTED_INVOCABLE_SCRIPTS_FOLDER_KEY, ['root', FOLDER, 'other']);
    trust.untrust();

    expect(trust.isTrusted()).toBe(false);
    expect(trust.getTrustedFolders()).toEqual(['other']);
  });

  it('should do nothing on untrust when no folder is configured', () => {
    storage.set(TRUSTED_INVOCABLE_SCRIPTS_FOLDER_KEY, [FOLDER]);
    folder = '';
    trust.untrust();

    expect(trust.getTrustedFolders()).toEqual([FOLDER]);
  });

  it('should remove one trusted folder', () => {
    storage.set(TRUSTED_INVOCABLE_SCRIPTS_FOLDER_KEY, [FOLDER, 'other']);
    trust.removeTrustedFolder(FOLDER);

    expect(trust.isTrusted()).toBe(false);
    expect(trust.getTrustedFolders()).toEqual(['other']);
  });

  it('should migrate the single folder an earlier version stored into a list', () => {
    storage.set(TRUSTED_INVOCABLE_SCRIPTS_FOLDER_KEY, FOLDER);

    expect(trust.isTrusted()).toBe(true);
    expect(storage.get(TRUSTED_INVOCABLE_SCRIPTS_FOLDER_KEY)).toEqual([FOLDER]);
  });

  it('should migrate an empty stored string into no trusted folders', () => {
    storage.set(TRUSTED_INVOCABLE_SCRIPTS_FOLDER_KEY, '');

    expect(trust.getTrustedFolders()).toEqual([]);
    expect(storage.has(TRUSTED_INVOCABLE_SCRIPTS_FOLDER_KEY)).toBe(false);
  });

  it('should trust nothing from a malformed stored value', () => {
    storage.set(TRUSTED_INVOCABLE_SCRIPTS_FOLDER_KEY, { folder: FOLDER });

    expect(trust.isTrusted()).toBe(false);
    expect(trust.getTrustedFolders()).toEqual([]);
  });

  it('should drop non-string, empty and duplicate entries', () => {
    storage.set(TRUSTED_INVOCABLE_SCRIPTS_FOLDER_KEY, [FOLDER, 1, '', FOLDER, 'a']);

    expect(trust.getTrustedFolders()).toEqual(['a', FOLDER]);
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
