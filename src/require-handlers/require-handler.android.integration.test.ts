import { evalInObsidian } from 'obsidian-integration-testing';
import { getTempVault } from 'obsidian-integration-testing/vitest-global-setup';
import {
  beforeAll,
  describe,
  expect,
  it
} from 'vitest';

type RequireAsyncFn = (id: string, options?: Record<string, unknown>) => Promise<unknown>;

const SCRIPTS_DIR = '_int-test-android';

beforeAll(() => {
  const vault = getTempVault();

  vault.populate({
    [`${SCRIPTS_DIR}/module.cjs`]: 'exports.value = "android-ok";',
    [`${SCRIPTS_DIR}/module.json`]: JSON.stringify({ android: true }),
    [`${SCRIPTS_DIR}/module.mts`]: 'export const value: string = "mts-android";'
  });
});

function vaultPath(): string {
  return getTempVault().path;
}

describe('RequireHandler Android integration', () => {
  describe('features available on Android', () => {
    it('should requireAsync a CJS module on Android', async () => {
      const result = await evalInObsidian({
        args: { dir: SCRIPTS_DIR },
        async fn({ dir }) {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          return (await requireAsync(`//${dir}/module.cjs`)) as Record<string, unknown>;
        },
        vaultPath: vaultPath()
      });

      expect(result).toHaveProperty('value', 'android-ok');
    });

    it('should requireAsync a JSON module on Android', async () => {
      const result = await evalInObsidian({
        args: { dir: SCRIPTS_DIR },
        async fn({ dir }) {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          return (await requireAsync(`//${dir}/module.json`)) as Record<string, unknown>;
        },
        vaultPath: vaultPath()
      });

      expect(result).toEqual({ android: true });
    });

    it('should requireAsync a TypeScript module on Android', async () => {
      const result = await evalInObsidian({
        args: { dir: SCRIPTS_DIR },
        async fn({ dir }) {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          return (await requireAsync(`//${dir}/module.mts`)) as Record<string, unknown>;
        },
        vaultPath: vaultPath()
      });

      expect(result).toHaveProperty('value', 'mts-android');
    });

    it('should requireAsync the obsidian module on Android', async () => {
      const result = await evalInObsidian({
        async fn() {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          const mod = (await requireAsync('obsidian')) as Record<string, unknown>;
          return { hasPlugin: typeof mod['Plugin'] === 'function' };
        },
        vaultPath: vaultPath()
      });

      expect(result.hasPlugin).toBe(true);
    });
  });

  describe('features unavailable on Android', () => {
    it('should throw when using synchronous require() on Android', async () => {
      const result = await evalInObsidian({
        args: { dir: SCRIPTS_DIR },
        fn({ dir }) {
          const requireFn = Reflect.get(window, 'require') as (id: string) => unknown;
          try {
            requireFn(`//${dir}/module.cjs`);
            return { error: '', threw: false };
          } catch (e: unknown) {
            return { error: (e as Error).message, threw: true };
          }
        },
        vaultPath: vaultPath()
      });

      expect(result.threw).toBe(true);
      expect(result.error).toContain('Cannot require synchronously on mobile');
    });

    it('should throw when requiring electron module on Android', async () => {
      const result = await evalInObsidian({
        async fn() {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          try {
            await requireAsync('electron');
            return { error: '', threw: false };
          } catch (e: unknown) {
            return { error: (e as Error).message, threw: true };
          }
        },
        vaultPath: vaultPath()
      });

      expect(result.threw).toBe(true);
      expect(result.error).toContain('Electron modules are not available on mobile');
    });

    it('should throw when requiring Node built-in module on Android', async () => {
      const result = await evalInObsidian({
        async fn() {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          try {
            await requireAsync('node:fs');
            return { error: '', threw: false };
          } catch (e: unknown) {
            return { error: (e as Error).message, threw: true };
          }
        },
        vaultPath: vaultPath()
      });

      expect(result.threw).toBe(true);
      expect(result.error).toContain('Node built-in modules are not available on mobile');
    });

    it('should return null for crypto module on Android', async () => {
      const result = await evalInObsidian({
        async fn() {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          const mod = await requireAsync('node:crypto');
          return { isNull: mod === null };
        },
        vaultPath: vaultPath()
      });

      expect(result.isNull).toBe(true);
    });
  });
});
