import dedent from 'dedent';
import { evalInObsidian } from 'obsidian-integration-testing';
import { getTempVault } from 'obsidian-integration-testing/vitest-global-setup';
import {
  beforeAll,
  describe,
  expect,
  it
} from 'vitest';

type RequireAsyncFn = (id: string, options?: Record<string, unknown>) => Promise<unknown>;
type RequireAsyncWrapperFn = (fn: (require: (id: string, options?: Record<string, unknown>) => unknown) => unknown) => Promise<unknown>;
type RequireFn = (id: string, options?: Record<string, unknown>) => unknown;

const SCRIPTS_DIR = '_int-test-scripts';

beforeAll(() => {
  const vault = getTempVault();

  vault.populate({
    [`${SCRIPTS_DIR}/dynamic-target.mjs`]: 'export const dynValue = "dynamic-ok";',
    [`${SCRIPTS_DIR}/module.cjs`]: 'exports.value = 42;',
    [`${SCRIPTS_DIR}/module.cts`]: 'exports.value = \'cts-\' + (1 + 2).toString();',
    [`${SCRIPTS_DIR}/module.json`]: JSON.stringify({ key: 'val', num: 7 }),
    [`${SCRIPTS_DIR}/module.md`]: dedent`
      \`\`\`code-script
      export const mdValue = "from-markdown";
      \`\`\`
    `,
    [`${SCRIPTS_DIR}/module.mjs`]: 'export const value = \'esm-ok\';',
    [`${SCRIPTS_DIR}/module.mts`]: 'export const value: string = \'mts-ok\';',
    [`${SCRIPTS_DIR}/nested/child.cjs`]: 'exports.child = true;',
    [`${SCRIPTS_DIR}/npm-test/node_modules/fake-pkg/index.js`]: 'exports.name = "fake-pkg";',
    [`${SCRIPTS_DIR}/npm-test/node_modules/fake-pkg/package.json`]: JSON.stringify({ main: 'index.js', name: 'fake-pkg', version: '1.0.0' }),
    [`${SCRIPTS_DIR}/npm-test/package.json`]: JSON.stringify({ dependencies: { 'fake-pkg': '1.0.0' }, name: 'npm-test' }),
    [`${SCRIPTS_DIR}/relative-parent.cjs`]: 'const child = require(\'./nested/child.cjs\'); exports.childValue = child.child;',
    [`${SCRIPTS_DIR}/top-level-await.mjs`]: 'const x = await Promise.resolve(99); export { x };'
  });
});

function vaultPath(): string {
  return getTempVault().path;
}

describe('RequireHandler integration', () => {
  describe('module formats', () => {
    it('should require a CJS module', async () => {
      const result = await evalInObsidian({
        args: { dir: SCRIPTS_DIR },
        async fn({ dir }) {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          return (await requireAsync(`//${dir}/module.cjs`)) as Record<string, unknown>;
        },
        vaultPath: vaultPath()
      });

      expect(result).toHaveProperty('value', 42);
    });

    it('should require an ESM module', async () => {
      const result = await evalInObsidian({
        args: { dir: SCRIPTS_DIR },
        async fn({ dir }) {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          return (await requireAsync(`//${dir}/module.mjs`)) as Record<string, unknown>;
        },
        vaultPath: vaultPath()
      });

      expect(result).toHaveProperty('value', 'esm-ok');
    });

    it('should require a TypeScript CTS module', async () => {
      const result = await evalInObsidian({
        args: { dir: SCRIPTS_DIR },
        async fn({ dir }) {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          return (await requireAsync(`//${dir}/module.cts`)) as Record<string, unknown>;
        },
        vaultPath: vaultPath()
      });

      expect(result).toHaveProperty('value', 'cts-3');
    });

    it('should require a TypeScript MTS module', async () => {
      const result = await evalInObsidian({
        args: { dir: SCRIPTS_DIR },
        async fn({ dir }) {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          return (await requireAsync(`//${dir}/module.mts`)) as Record<string, unknown>;
        },
        vaultPath: vaultPath()
      });

      expect(result).toHaveProperty('value', 'mts-ok');
    });

    it('should require a JSON module', async () => {
      const result = await evalInObsidian({
        args: { dir: SCRIPTS_DIR },
        async fn({ dir }) {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          return (await requireAsync(`//${dir}/module.json`)) as Record<string, unknown>;
        },
        vaultPath: vaultPath()
      });

      expect(result).toEqual({ key: 'val', num: 7 });
    });

    it('should require a Markdown module with code-script block', async () => {
      const result = await evalInObsidian({
        args: { dir: SCRIPTS_DIR },
        async fn({ dir }) {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          return (await requireAsync(`//${dir}/module.md`)) as Record<string, unknown>;
        },
        vaultPath: vaultPath()
      });

      expect(result).toHaveProperty('mdValue', 'from-markdown');
    });
  });

  describe('path resolution', () => {
    it('should resolve relative paths with parentPath option', async () => {
      const result = await evalInObsidian({
        args: { dir: SCRIPTS_DIR },
        async fn({ dir }) {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          return (await requireAsync('./nested/child.cjs', {
            parentPath: `${dir}/relative-parent.cjs`
          })) as Record<string, unknown>;
        },
        vaultPath: vaultPath()
      });

      expect(result).toHaveProperty('child', true);
    });

    it('should resolve transitive require chains', async () => {
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
  });

  describe('built-in modules', () => {
    it('should require the obsidian module', async () => {
      const result = await evalInObsidian({
        async fn() {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          const mod = (await requireAsync('obsidian')) as Record<string, unknown>;
          return {
            hasNotice: typeof mod['Notice'] === 'function',
            hasPlugin: typeof mod['Plugin'] === 'function'
          };
        },
        vaultPath: vaultPath()
      });

      expect(result.hasNotice).toBe(true);
      expect(result.hasPlugin).toBe(true);
    });

    it('should require @codemirror/state module', async () => {
      const result = await evalInObsidian({
        async fn() {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          const mod = (await requireAsync('@codemirror/state')) as Record<string, unknown>;
          return {
            hasEditorState: typeof mod['EditorState'] === 'function'
          };
        },
        vaultPath: vaultPath()
      });

      expect(result.hasEditorState).toBe(true);
    });
  });

  describe('async features', () => {
    it('should support top-level await in requireAsync', async () => {
      const result = await evalInObsidian({
        args: { dir: SCRIPTS_DIR },
        async fn({ dir }) {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          return (await requireAsync(`//${dir}/top-level-await.mjs`)) as Record<string, unknown>;
        },
        vaultPath: vaultPath()
      });

      expect(result).toHaveProperty('x', 99);
    });

    it('should support dynamic import', async () => {
      const result = await evalInObsidian({
        args: { dir: SCRIPTS_DIR },
        async fn({ dir }) {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          const mod = (await requireAsync(`//${dir}/dynamic-target.mjs`)) as Record<string, unknown>;
          return { dynValue: mod['dynValue'] };
        },
        vaultPath: vaultPath()
      });

      expect(result.dynValue).toBe('dynamic-ok');
    });

    it('should support requireAsyncWrapper', async () => {
      const result = await evalInObsidian({
        args: { dir: SCRIPTS_DIR },
        async fn({ dir }) {
          const requireAsyncWrapper = Reflect.get(window, 'requireAsyncWrapper') as RequireAsyncWrapperFn;
          return (await requireAsyncWrapper((require) => {
            const modulePath = `//${dir}/module.cjs`;
            // eslint-disable-next-line import-x/no-dynamic-require -- vault-root-relative path resolved at runtime
            const mod = require(modulePath) as Record<string, unknown>;
            return mod['value'];
          })) as number;
        },
        vaultPath: vaultPath()
      });

      expect(result).toBe(42);
    });
  });

  describe('synchronous require', () => {
    it('should require a CJS module synchronously via global require()', async () => {
      const result = await evalInObsidian({
        args: { dir: SCRIPTS_DIR },
        fn({ dir }) {
          const requireFn = Reflect.get(window, 'require') as RequireFn;
          return (requireFn(`//${dir}/module.cjs`)) as Record<string, unknown>;
        },
        vaultPath: vaultPath()
      });

      expect(result).toHaveProperty('value', 42);
    });

    it('should require a JSON module synchronously via global require()', async () => {
      const result = await evalInObsidian({
        args: { dir: SCRIPTS_DIR },
        fn({ dir }) {
          const requireFn = Reflect.get(window, 'require') as RequireFn;
          return (requireFn(`//${dir}/module.json`)) as Record<string, unknown>;
        },
        vaultPath: vaultPath()
      });

      expect(result).toEqual({ key: 'val', num: 7 });
    });

    it('should require an ESM module synchronously via global require()', async () => {
      const result = await evalInObsidian({
        args: { dir: SCRIPTS_DIR },
        fn({ dir }) {
          const requireFn = Reflect.get(window, 'require') as RequireFn;
          return (requireFn(`//${dir}/module.mjs`)) as Record<string, unknown>;
        },
        vaultPath: vaultPath()
      });

      expect(result).toHaveProperty('value', 'esm-ok');
    });

    it('should require a TypeScript CTS module synchronously via global require()', async () => {
      const result = await evalInObsidian({
        args: { dir: SCRIPTS_DIR },
        fn({ dir }) {
          const requireFn = Reflect.get(window, 'require') as RequireFn;
          return (requireFn(`//${dir}/module.cts`)) as Record<string, unknown>;
        },
        vaultPath: vaultPath()
      });

      expect(result).toHaveProperty('value', 'cts-3');
    });

    it('should require a TypeScript MTS module synchronously via global require()', async () => {
      const result = await evalInObsidian({
        args: { dir: SCRIPTS_DIR },
        fn({ dir }) {
          const requireFn = Reflect.get(window, 'require') as RequireFn;
          return (requireFn(`//${dir}/module.mts`)) as Record<string, unknown>;
        },
        vaultPath: vaultPath()
      });

      expect(result).toHaveProperty('value', 'mts-ok');
    });

    it('should require a Markdown module synchronously via global require()', async () => {
      const result = await evalInObsidian({
        args: { dir: SCRIPTS_DIR },
        fn({ dir }) {
          const requireFn = Reflect.get(window, 'require') as RequireFn;
          return (requireFn(`//${dir}/module.md`)) as Record<string, unknown>;
        },
        vaultPath: vaultPath()
      });

      expect(result).toHaveProperty('mdValue', 'from-markdown');
    });

    it('should require the obsidian module synchronously via global require()', async () => {
      const result = await evalInObsidian({
        fn() {
          const requireFn = Reflect.get(window, 'require') as RequireFn;
          const mod = requireFn('obsidian') as Record<string, unknown>;
          return {
            hasNotice: typeof mod['Notice'] === 'function',
            hasPlugin: typeof mod['Plugin'] === 'function'
          };
        },
        vaultPath: vaultPath()
      });

      expect(result.hasNotice).toBe(true);
      expect(result.hasPlugin).toBe(true);
    });

    it('should require @codemirror/state synchronously via global require()', async () => {
      const result = await evalInObsidian({
        fn() {
          const requireFn = Reflect.get(window, 'require') as RequireFn;
          const mod = requireFn('@codemirror/state') as Record<string, unknown>;
          return { hasEditorState: typeof mod['EditorState'] === 'function' };
        },
        vaultPath: vaultPath()
      });

      expect(result.hasEditorState).toBe(true);
    });

    it('should require obsidian/app synchronously via global require()', async () => {
      const result = await evalInObsidian({
        fn() {
          const requireFn = Reflect.get(window, 'require') as RequireFn;
          const appModule = requireFn('obsidian/app') as Record<string, unknown>;
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

    it('should require obsidian/specialModuleNames synchronously via global require()', async () => {
      const result = await evalInObsidian({
        fn() {
          const requireFn = Reflect.get(window, 'require') as RequireFn;
          const mod = requireFn('obsidian/specialModuleNames') as Record<string, unknown>;
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

    it('should require obsidian-dev-utils synchronously via global require()', async () => {
      const result = await evalInObsidian({
        fn() {
          const requireFn = Reflect.get(window, 'require') as RequireFn;
          const mod = requireFn('obsidian-dev-utils') as object;
          return { hasKeys: Object.keys(mod).length > 0 };
        },
        vaultPath: vaultPath()
      });

      expect(result.hasKeys).toBe(true);
    });

    it('should require Node built-in module synchronously via global require()', async () => {
      const result = await evalInObsidian({
        fn() {
          const requireFn = Reflect.get(window, 'require') as RequireFn;
          const pathMod = requireFn('node:path') as Record<string, unknown>;
          return {
            hasJoin: typeof pathMod['join'] === 'function',
            hasResolve: typeof pathMod['resolve'] === 'function'
          };
        },
        vaultPath: vaultPath()
      });

      expect(result.hasJoin).toBe(true);
      expect(result.hasResolve).toBe(true);
    });

    it('should require electron synchronously via global require()', async () => {
      const result = await evalInObsidian({
        fn() {
          const requireFn = Reflect.get(window, 'require') as RequireFn;
          const mod = requireFn('electron') as Record<string, unknown>;
          return { hasIpcRenderer: typeof mod['ipcRenderer'] === 'object' };
        },
        vaultPath: vaultPath()
      });

      expect(result.hasIpcRenderer).toBe(true);
    });

    it('should require @electron/remote synchronously via global require()', async () => {
      const result = await evalInObsidian({
        fn() {
          const requireFn = Reflect.get(window, 'require') as RequireFn;
          const mod = requireFn('@electron/remote') as Record<string, unknown>;
          return {
            hasApp: typeof mod['app'] === 'object',
            isObject: typeof mod === 'object'
          };
        },
        vaultPath: vaultPath()
      });

      expect(result.isObject).toBe(true);
      expect(result.hasApp).toBe(true);
    });

    it('should resolve relative path synchronously via global require()', async () => {
      const result = await evalInObsidian({
        args: { dir: SCRIPTS_DIR },
        fn({ dir }) {
          const requireFn = Reflect.get(window, 'require') as RequireFn;
          return (requireFn(`//${dir}/relative-parent.cjs`)) as Record<string, unknown>;
        },
        vaultPath: vaultPath()
      });

      expect(result).toHaveProperty('childValue', true);
    });

    it('should require NPM module synchronously via global require()', async () => {
      const result = await evalInObsidian({
        args: { dir: SCRIPTS_DIR },
        fn({ dir }) {
          const requireFn = Reflect.get(window, 'require') as RequireFn;
          return (requireFn('fake-pkg', {
            parentPath: `${dir}/npm-test/index.js`
          })) as Record<string, unknown>;
        },
        vaultPath: vaultPath()
      });

      expect(result).toHaveProperty('name', 'fake-pkg');
    });
  });

  describe('NPM modules', () => {
    it('should require an NPM module from vault node_modules', async () => {
      const result = await evalInObsidian({
        args: { dir: SCRIPTS_DIR },
        async fn({ dir }) {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          return (await requireAsync('fake-pkg', {
            parentPath: `${dir}/npm-test/index.js`
          })) as Record<string, unknown>;
        },
        vaultPath: vaultPath()
      });

      expect(result).toHaveProperty('name', 'fake-pkg');
    });
  });

  describe('smart caching', () => {
    it('should re-read module with cacheInvalidationMode always', async () => {
      const result = await evalInObsidian({
        args: { dir: SCRIPTS_DIR },
        async fn({ app, dir }) {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          const cachePath = `${dir}/cache-test.cjs`;

          // Write initial module
          await app.vault.adapter.write(cachePath, 'exports.version = 1;');

          // First require — should get version 1
          const mod1 = (await requireAsync(`//${cachePath}`, { cacheInvalidationMode: 'always' })) as Record<string, unknown>;
          const v1 = mod1['version'];

          // Overwrite with version 2
          await app.vault.adapter.write(cachePath, 'exports.version = 2;');

          // Second require with always — should get version 2
          const mod2 = (await requireAsync(`//${cachePath}`, { cacheInvalidationMode: 'always' })) as Record<string, unknown>;
          const v2 = mod2['version'];

          return { v1, v2 };
        },
        vaultPath: vaultPath()
      });

      expect(result.v1).toBe(1);
      expect(result.v2).toBe(2);
    });
  });

  describe('special modules', () => {
    it('should require obsidian/app module', async () => {
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

    it('should require obsidian-dev-utils module', async () => {
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

    it('should require obsidian/specialModuleNames module', async () => {
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

    it('should require Node built-in module via node: prefix', async () => {
      const result = await evalInObsidian({
        async fn() {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          const pathMod = (await requireAsync('node:path')) as Record<string, unknown>;
          return {
            hasJoin: typeof pathMod['join'] === 'function',
            hasResolve: typeof pathMod['resolve'] === 'function'
          };
        },
        vaultPath: vaultPath()
      });

      expect(result.hasJoin).toBe(true);
      expect(result.hasResolve).toBe(true);
    });
  });

  describe('desktop modules', () => {
    it('should require the electron module', async () => {
      const result = await evalInObsidian({
        async fn() {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          const mod = (await requireAsync('electron')) as Record<string, unknown>;
          return {
            hasIpcRenderer: typeof mod['ipcRenderer'] === 'object'
          };
        },
        vaultPath: vaultPath()
      });

      expect(result.hasIpcRenderer).toBe(true);
    });

    it('should require @electron/remote module', async () => {
      const result = await evalInObsidian({
        async fn() {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          const mod = (await requireAsync('@electron/remote')) as Record<string, unknown>;
          return {
            hasApp: typeof mod['app'] === 'object',
            isObject: typeof mod === 'object'
          };
        },
        vaultPath: vaultPath()
      });

      expect(result.isObject).toBe(true);
      expect(result.hasApp).toBe(true);
    });
  });

  describe('module type override', () => {
    it('should load a .txt file as JavaScript with moduleType override', async () => {
      const result = await evalInObsidian({
        args: { dir: SCRIPTS_DIR },
        async fn({ app, dir }) {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          const txtPath = `${dir}/script-as-txt.txt`;
          await app.vault.adapter.write(txtPath, 'exports.fromTxt = "loaded";');
          return (await requireAsync(`//${txtPath}`, { moduleType: 'jsTs' })) as Record<string, unknown>;
        },
        vaultPath: vaultPath()
      });

      expect(result).toHaveProperty('fromTxt', 'loaded');
    });

    it('should load a file as JSON with moduleType override', async () => {
      const result = await evalInObsidian({
        args: { dir: SCRIPTS_DIR },
        async fn({ app, dir }) {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          const datPath = `${dir}/data-file.dat`;
          await app.vault.adapter.write(datPath, JSON.stringify({ loaded: true }));
          return (await requireAsync(`//${datPath}`, { moduleType: 'json' })) as Record<string, unknown>;
        },
        vaultPath: vaultPath()
      });

      expect(result).toEqual({ loaded: true });
    });
  });

  describe('source maps', () => {
    it('should include source file path in error stack trace via source maps', async () => {
      const result = await evalInObsidian({
        args: { dir: SCRIPTS_DIR },
        async fn({ app, dir }) {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          const tsPath = `${dir}/sourcemap-error.ts`;
          await app.vault.adapter.write(tsPath, 'export function throwErr(): never { throw new Error("source-map-test"); }');

          const mod = (await requireAsync(`//${tsPath}`, { cacheInvalidationMode: 'always' })) as Record<string, unknown>;
          const throwErr = mod['throwErr'] as () => never;

          try {
            throwErr();
            return { error: 'Did not throw', hasSourcePath: false };
          } catch (e: unknown) {
            const stack = (e as Error).stack ?? '';
            // Source map should map the error back to the original .ts file path
            const hasSourcePath = stack.includes(tsPath) || stack.includes('sourcemap-error');
            return { hasSourcePath, stack: stack.substring(0, 500) };
          }
        },
        vaultPath: vaultPath()
      });

      expect(result.hasSourcePath).toBe(true);
    });
  });

  describe('clear cache', () => {
    it('should clear cache so re-require gets fresh module', async () => {
      const result = await evalInObsidian({
        args: { dir: SCRIPTS_DIR, pluginId: 'fix-require-modules' },
        async fn({ app, dir, pluginId }) {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          const cachePath = `${dir}/clear-cache-test.cjs`;

          // Write and require version 1
          await app.vault.adapter.write(cachePath, 'exports.version = 1;');
          const mod1 = (await requireAsync(`//${cachePath}`)) as Record<string, unknown>;
          const v1 = mod1['version'];

          // Overwrite with version 2
          await app.vault.adapter.write(cachePath, 'exports.version = 2;');

          // With cacheInvalidationMode: never, should still get version 1
          const mod2 = (await requireAsync(`//${cachePath}`, { cacheInvalidationMode: 'never' })) as Record<string, unknown>;
          const v2Cached = mod2['version'];

          // Clear cache via command
          app.commands.executeCommandById(`${pluginId}:clear-cache`);

          // Now re-require should get version 2
          const mod3 = (await requireAsync(`//${cachePath}`)) as Record<string, unknown>;
          const v3Fresh = mod3['version'];

          return { v1, v2Cached, v3Fresh };
        },
        vaultPath: vaultPath()
      });

      expect(result.v1).toBe(1);
      expect(result.v2Cached).toBe(1);
      expect(result.v3Fresh).toBe(2);
    });
  });
});
