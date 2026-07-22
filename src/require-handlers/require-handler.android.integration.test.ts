import type { TFile } from 'obsidian';

import dedent from 'dedent';
import { evalInObsidian } from 'obsidian-integration-testing';
import { getTempVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  beforeAll,
  describe,
  expect,
  it
} from 'vitest';

type RequireAsyncFn = (id: string | TFile, options?: Record<string, unknown>) => Promise<unknown>;

const SCRIPTS_DIR = '_int-test-android';

function createMinimalWasm(): Uint8Array {
  return new Uint8Array([
    // Magic + version
    0x00,
    0x61,
    0x73,
    0x6D,
    0x01,
    0x00,
    0x00,
    0x00,
    // Type section (id=1, 7 bytes): 1 func type (i32, i32) -> i32
    0x01,
    0x07,
    0x01,
    0x60,
    0x02,
    0x7F,
    0x7F,
    0x01,
    0x7F,
    // Function section (id=3, 2 bytes): 1 function, type index 0
    0x03,
    0x02,
    0x01,
    0x00,
    // Export section (id=7, 7 bytes): 1 export "add", kind=func, index=0
    0x07,
    0x07,
    0x01,
    0x03,
    0x61,
    0x64,
    0x64,
    0x00,
    0x00,
    // Code section (id=10, 9 bytes): 1 body (7 bytes), 0 locals, local.get 0, local.get 1, i32.add, end
    0x0A,
    0x09,
    0x01,
    0x07,
    0x00,
    0x20,
    0x00,
    0x20,
    0x01,
    0x6A,
    0x0B
  ]);
}

beforeAll(async () => {
  const vault = getTempVault();

  vault.populate({
    [`${SCRIPTS_DIR}/module.cjs`]: 'exports.value = "android-ok";',
    [`${SCRIPTS_DIR}/module.json`]: JSON.stringify({ android: true }),
    [`${SCRIPTS_DIR}/module.md`]: dedent`
      \`\`\`code-script
      export const mdValue = "android-md";
      \`\`\`
    `,
    [`${SCRIPTS_DIR}/module.mjs`]: 'export const value = "esm-android";',
    [`${SCRIPTS_DIR}/module.mts`]: 'export const value: string = "mts-android";',
    [`${SCRIPTS_DIR}/module.wasm`]: createMinimalWasm(),
    [`${SCRIPTS_DIR}/nested/child.cjs`]: 'exports.child = true;',
    [`${SCRIPTS_DIR}/relative-parent.cjs`]: 'const child = require(\'./nested/child.cjs\'); exports.childValue = child.child;'
  });

  await vault.syncToDevice();
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

    it('should requireAsync an ESM module on Android', async () => {
      const result = await evalInObsidian({
        args: { dir: SCRIPTS_DIR },
        async fn({ dir }) {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          return (await requireAsync(`//${dir}/module.mjs`)) as Record<string, unknown>;
        },
        vaultPath: vaultPath()
      });

      expect(result).toHaveProperty('value', 'esm-android');
    });

    it('should requireAsync a Markdown module on Android', async () => {
      const result = await evalInObsidian({
        args: { dir: SCRIPTS_DIR },
        async fn({ dir }) {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          return (await requireAsync(`//${dir}/module.md`)) as Record<string, unknown>;
        },
        vaultPath: vaultPath()
      });

      expect(result).toHaveProperty('mdValue', 'android-md');
    });

    it('should requireAsync obsidian/app on Android', async () => {
      const result = await evalInObsidian({
        async fn() {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          const appModule = (await requireAsync('obsidian/app')) as Record<string, unknown>;
          return {
            hasVault: typeof appModule['vault'] === 'object',
            hasWorkspace: typeof appModule['workspace'] === 'object'
          };
        },
        vaultPath: vaultPath()
      });

      expect(result.hasVault).toBe(true);
      expect(result.hasWorkspace).toBe(true);
    });

    it('should requireAsync obsidian/specialModuleNames on Android', async () => {
      const result = await evalInObsidian({
        async fn() {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          const mod = (await requireAsync('obsidian/specialModuleNames')) as Record<string, unknown>;
          return {
            hasNodeBuiltIn: Array.isArray(mod['nodeBuiltInModuleNames']),
            hasObsidianBuiltIn: Array.isArray(mod['obsidianBuiltInModuleNames'])
          };
        },
        vaultPath: vaultPath()
      });

      expect(result.hasNodeBuiltIn).toBe(true);
      expect(result.hasObsidianBuiltIn).toBe(true);
    });

    it('should requireAsync obsidian-dev-utils on Android', async () => {
      const result = await evalInObsidian({
        async fn() {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          const mod = await requireAsync('obsidian-dev-utils');
          return { hasKeys: Object.keys(mod as object).length > 0 };
        },
        vaultPath: vaultPath()
      });

      expect(result.hasKeys).toBe(true);
    });

    it('should resolve relative paths via requireAsync on Android', async () => {
      const result = await evalInObsidian({
        args: { dir: SCRIPTS_DIR },
        async fn({ dir }) {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          return (await requireAsync(`//${dir}/relative-parent.cjs`)) as Record<string, unknown>;
        },
        vaultPath: vaultPath()
      });

      expect(result).toHaveProperty('childValue', true);
    });

    it('should requireAsync a module via file:/// URL on Android', async () => {
      const result = await evalInObsidian({
        args: { dir: SCRIPTS_DIR },
        async fn({ app, dir }) {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          const basePath = Reflect.get(app.vault.adapter, 'basePath') as string;
          const filePath = `${basePath}/${dir}/module.cjs`.replaceAll('\\', '/');
          return (await requireAsync(`file:///${filePath}`)) as Record<string, unknown>;
        },
        vaultPath: vaultPath()
      });

      expect(result).toHaveProperty('value', 'android-ok');
    });

    it('should requireAsync a module via resource URL on Android', async () => {
      const result = await evalInObsidian({
        args: { dir: SCRIPTS_DIR },
        async fn({ app, dir }) {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          const obsidianMod = (await requireAsync('obsidian')) as Record<string, unknown>;
          const Platform = obsidianMod['Platform'] as Record<string, unknown>;
          const resourcePathPrefix = Platform['resourcePathPrefix'] as string;
          const basePath = Reflect.get(app.vault.adapter, 'basePath') as string;
          const filePath = `${basePath}/${dir}/module.cjs`.replaceAll('\\', '/');
          return (await requireAsync(`${resourcePathPrefix}${filePath}`)) as Record<string, unknown>;
        },
        vaultPath: vaultPath()
      });

      expect(result).toHaveProperty('value', 'android-ok');
    });

    it('should requireAsync a module from an HTTP URL on Android', async () => {
      const result = await evalInObsidian({
        async fn() {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          const mod = (await requireAsync(
            'https://cdn.jsdelivr.net/npm/is-number@7.0.0/index.js',
            { moduleType: 'jsTs' }
          )) as Record<string, unknown>;
          const isNumber = mod['default'] as (val: unknown) => boolean;
          return { result: isNumber(5) };
        },
        vaultPath: vaultPath()
      });

      expect(result.result).toBe(true);
    });

    it('should requireAsync @codemirror/state on Android', async () => {
      const result = await evalInObsidian({
        async fn() {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          const mod = (await requireAsync('@codemirror/state')) as Record<string, unknown>;
          return { hasEditorState: typeof mod['EditorState'] === 'function' };
        },
        vaultPath: vaultPath()
      });

      expect(result.hasEditorState).toBe(true);
    });

    it('should requireAsync a WASM module on Android', async () => {
      const result = await evalInObsidian({
        args: { dir: SCRIPTS_DIR },
        async fn({ dir }) {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          const mod = (await requireAsync(`//${dir}/module.wasm`)) as Record<string, unknown>;
          const add = mod['add'] as (a: number, b: number) => number;
          return { result: add(3, 4) };
        },
        vaultPath: vaultPath()
      });

      expect(result.result).toBe(7);
    });
  });

  describe('TFile instances', () => {
    it('should requireAsync a module via TFile instance on Android', async () => {
      const result = await evalInObsidian({
        args: { dir: SCRIPTS_DIR },
        async fn({ app, dir }) {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          const file = app.vault.getFileByPath(`${dir}/module.cjs`);
          if (!file) {
            return { error: 'File not found', value: null };
          }
          return (await requireAsync(file)) as Record<string, unknown>;
        },
        vaultPath: vaultPath()
      });

      expect(result).toHaveProperty('value', 'android-ok');
    });

    it('should forward options when requireAsync is called with TFile on Android', async () => {
      const result = await evalInObsidian({
        args: { dir: SCRIPTS_DIR },
        async fn({ app, dir }) {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          const cachePath = `${dir}/tfile-cache-test.cjs`;

          await app.vault.adapter.write(cachePath, 'exports.version = 1;');
          const file1 = app.vault.getFileByPath(cachePath);
          if (!file1) {
            return { error: 'File not found', v1: null, v2: null };
          }

          const mod1 = (await requireAsync(file1, { cacheInvalidationMode: 'always' })) as Record<string, unknown>;
          const v1 = mod1['version'];

          await app.vault.adapter.write(cachePath, 'exports.version = 2;');
          const file2 = app.vault.getFileByPath(cachePath);
          if (!file2) {
            return { error: 'File not found after rewrite', v1, v2: null };
          }

          const mod2 = (await requireAsync(file2, { cacheInvalidationMode: 'always' })) as Record<string, unknown>;
          const v2 = mod2['version'];

          return { v1, v2 };
        },
        vaultPath: vaultPath()
      });

      expect(result.v1).toBe(1);
      expect(result.v2).toBe(2);
    });
  });

  describe('wikilinks and markdown links', () => {
    it('should requireAsync a module via wikilink on Android', async () => {
      const result = await evalInObsidian({
        args: { dir: SCRIPTS_DIR },
        async fn({ dir }) {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          return (await requireAsync(`[[${dir}/module.cjs]]`)) as Record<string, unknown>;
        },
        vaultPath: vaultPath()
      });

      expect(result).toHaveProperty('value', 'android-ok');
    });

    it('should requireAsync a module via markdown link on Android', async () => {
      const result = await evalInObsidian({
        args: { dir: SCRIPTS_DIR },
        async fn({ dir }) {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          return (await requireAsync(`[Module](${dir}/module.cjs)`)) as Record<string, unknown>;
        },
        vaultPath: vaultPath()
      });

      expect(result).toHaveProperty('value', 'android-ok');
    });
  });

  describe('features unavailable on Android', () => {
    it('should throw when using synchronous require() on Android', async () => {
      const result = await evalInObsidian({
        args: { dir: SCRIPTS_DIR },
        fn({ dir }) {
          const requireFn = Reflect.get(window, 'require') as (id: string) => unknown;
          try {
            // Use a path not cached by prior requireAsync tests
            requireFn(`//${dir}/uncached-sync-test.cjs`);
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

    it('should throw when requiring a node binary on Android', async () => {
      const result = await evalInObsidian({
        args: { dir: SCRIPTS_DIR },
        async fn({ app, dir }) {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          const dummyPath = `${dir}/dummy.node`;
          const DUMMY_BYTE_VALUES = [0x00, 0x01, 0x02, 0x03];
          const dummyContent = new Uint8Array(DUMMY_BYTE_VALUES);
          await app.vault.adapter.writeBinary(dummyPath, dummyContent.buffer);

          try {
            await requireAsync(`//${dummyPath}`);
            return { error: '', threw: false };
          } catch (e: unknown) {
            return { error: (e as Error).message, threw: true };
          }
        },
        vaultPath: vaultPath()
      });

      expect(result.threw).toBe(true);
      expect(result.error).toContain('Node binary modules are not available on mobile');
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
