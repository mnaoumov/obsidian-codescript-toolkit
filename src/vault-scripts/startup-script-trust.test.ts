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

import { StartupScriptTrust } from './startup-script-trust.ts';
import { TRUSTED_STARTUP_SCRIPTS_KEY } from './trusted-startup-scripts-key.ts';

const mockConfirm = vi.fn();

vi.mock('@mnaoumov/obsidian-lib/modals/confirm', () => ({
  confirm: (...$arguments: unknown[]): unknown => mockConfirm(...$arguments)
}));

const PATH = 'root/startup.ts';

describe('StartupScriptTrust', () => {
  let storage: Map<string, unknown>;
  let path: string;
  let trust: StartupScriptTrust;

  beforeEach(() => {
    mockConfirm.mockReset().mockResolvedValue(false);
    storage = new Map<string>();
    path = PATH;

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

    trust = new StartupScriptTrust({
      app,
      pluginSettingsComponent: castTo<PluginSettingsComponent>({
        settings: { getStartupScriptPath: (): string => path }
      })
    });
  });

  it('should not trust a script by default', () => {
    expect(trust.isTrusted()).toBe(false);
  });

  it('should store the path in a list', () => {
    trust.trust();

    expect(storage.get(TRUSTED_STARTUP_SCRIPTS_KEY)).toEqual([PATH]);
    expect(trust.isTrusted()).toBe(true);
  });

  it('should treat another path as untrusted, even in the same folder', () => {
    trust.trust();
    path = 'root/other.ts';

    expect(trust.isTrusted()).toBe(false);
  });

  it('should keep every trusted path, so switching back does not need trust again', () => {
    trust.trust();
    path = 'other.ts';
    trust.trust();
    path = PATH;

    expect(trust.isTrusted()).toBe(true);
    expect(trust.getTrustedPaths()).toEqual(['other.ts', PATH]);
  });

  it('should not add a path twice', () => {
    trust.trust();
    trust.trust();

    expect(trust.getTrustedPaths()).toEqual([PATH]);
  });

  it('should never trust an empty path setting', () => {
    path = '';
    trust.trust();

    expect(storage.size).toBe(0);
    expect(trust.isTrusted()).toBe(false);
  });

  it('should untrust the script and keep the other paths', () => {
    storage.set(TRUSTED_STARTUP_SCRIPTS_KEY, [PATH, 'other.ts']);
    trust.untrust();

    expect(trust.isTrusted()).toBe(false);
    expect(trust.getTrustedPaths()).toEqual(['other.ts']);
  });

  it('should clear the stored list when the last path is untrusted', () => {
    trust.trust();
    trust.untrust();

    expect(storage.has(TRUSTED_STARTUP_SCRIPTS_KEY)).toBe(false);
  });

  it('should do nothing on untrust when no script is configured', () => {
    storage.set(TRUSTED_STARTUP_SCRIPTS_KEY, [PATH]);
    path = '';
    trust.untrust();

    expect(trust.getTrustedPaths()).toEqual([PATH]);
  });

  it('should remove one trusted path', () => {
    storage.set(TRUSTED_STARTUP_SCRIPTS_KEY, [PATH, 'other.ts']);
    trust.removeTrustedPath(PATH);

    expect(trust.getTrustedPaths()).toEqual(['other.ts']);
  });

  it('should trust nothing from a malformed stored value', () => {
    storage.set(TRUSTED_STARTUP_SCRIPTS_KEY, PATH);

    expect(trust.isTrusted()).toBe(false);
    expect(trust.getTrustedPaths()).toEqual([]);
  });

  it('should drop non-string, empty and duplicate entries', () => {
    storage.set(TRUSTED_STARTUP_SCRIPTS_KEY, [PATH, 1, '', PATH, 'a.ts']);

    expect(trust.getTrustedPaths()).toEqual(['a.ts', PATH]);
  });

  it('should trust the script when the user agrees', async () => {
    mockConfirm.mockResolvedValue(true);

    expect(await trust.promptForTrust()).toBe(true);
    expect(trust.isTrusted()).toBe(true);
  });

  it('should leave the script untrusted when the user declines', async () => {
    expect(await trust.promptForTrust()).toBe(false);
    expect(trust.isTrusted()).toBe(false);
  });

  it('should not prompt for a script that is already trusted', async () => {
    trust.trust();

    expect(await trust.promptForTrust()).toBe(true);
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  it('should not prompt when no script is configured', async () => {
    path = '';

    expect(await trust.promptForTrust()).toBe(false);
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  it('should prompt automatically once per path per session', async () => {
    expect(trust.shouldPromptAutomatically()).toBe(true);

    await trust.promptForTrust();

    expect(trust.shouldPromptAutomatically()).toBe(false);

    path = 'other.ts';
    expect(trust.shouldPromptAutomatically()).toBe(true);
  });

  it('should not prompt automatically for a trusted script', () => {
    trust.trust();

    expect(trust.shouldPromptAutomatically()).toBe(false);
  });
});
