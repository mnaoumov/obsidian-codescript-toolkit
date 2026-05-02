import dedent from 'dedent';
import { evalInObsidian } from 'obsidian-integration-testing';
import { getTempVault } from 'obsidian-integration-testing/vitest-global-setup';
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it
} from 'vitest';

type RequireAsyncFn = (id: string, options?: Record<string, unknown>) => Promise<unknown>;

const SCRIPTS_DIR = '_int-test-emulate-mobile';
const PLUGIN_ID = 'fix-require-modules';

beforeAll(async () => {
  const vault = getTempVault();

  vault.populate({
    [`${SCRIPTS_DIR}/module.cjs`]: 'exports.value = "emulate-mobile-ok";',
    [`${SCRIPTS_DIR}/module.json`]: JSON.stringify({ mobile: true }),
    [`${SCRIPTS_DIR}/module.md`]: dedent`
      \`\`\`code-script
      export const mdValue = "mobile-md";
      \`\`\`
    `,
    [`${SCRIPTS_DIR}/module.mjs`]: 'export const value = "esm-mobile";',
    [`${SCRIPTS_DIR}/module.mts`]: 'export const value: string = "mts-emulate";',
    [`${SCRIPTS_DIR}/nested/child.cjs`]: 'exports.child = true;',
    [`${SCRIPTS_DIR}/relative-parent.cjs`]: 'const child = require(\'./nested/child.cjs\'); exports.childValue = child.child;'
  });

  // Enable emulate-mobile mode and reload plugin
  await evalInObsidian({
    args: { pluginId: PLUGIN_ID },
    async fn({ app, pluginId }) {
      app.emulateMobile(true);
      await app.plugins.disablePlugin(pluginId);
      await app.plugins.enablePlugin(pluginId);
      const SETTLE_DELAY_MS = 2000;
      await sleep(SETTLE_DELAY_MS);
    },
    vaultPath: vault.path
  });
}, 30000);

afterAll(async () => {
  // Restore desktop mode
  await evalInObsidian({
    args: { pluginId: PLUGIN_ID },
    async fn({ app, pluginId }) {
      app.emulateMobile(false);
      await app.plugins.disablePlugin(pluginId);
      await app.plugins.enablePlugin(pluginId);
      const SETTLE_DELAY_MS = 2000;
      await sleep(SETTLE_DELAY_MS);
    },
    vaultPath: getTempVault().path
  });
});

function vaultPath(): string {
  return getTempVault().path;
}

describe('RequireHandler emulate-mobile integration', () => {
  describe('features available on mobile', () => {
    it('should requireAsync a CJS module in emulate-mobile mode', async () => {
      const result = await evalInObsidian({
        args: { dir: SCRIPTS_DIR },
        async fn({ dir }) {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          return (await requireAsync(`//${dir}/module.cjs`)) as Record<string, unknown>;
        },
        vaultPath: vaultPath()
      });

      expect(result).toHaveProperty('value', 'emulate-mobile-ok');
    });

    it('should requireAsync a JSON module in emulate-mobile mode', async () => {
      const result = await evalInObsidian({
        args: { dir: SCRIPTS_DIR },
        async fn({ dir }) {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          return (await requireAsync(`//${dir}/module.json`)) as Record<string, unknown>;
        },
        vaultPath: vaultPath()
      });

      expect(result).toEqual({ mobile: true });
    });

    it('should requireAsync a TypeScript module in emulate-mobile mode', async () => {
      const result = await evalInObsidian({
        args: { dir: SCRIPTS_DIR },
        async fn({ dir }) {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          return (await requireAsync(`//${dir}/module.mts`)) as Record<string, unknown>;
        },
        vaultPath: vaultPath()
      });

      expect(result).toHaveProperty('value', 'mts-emulate');
    });

    it('should requireAsync the obsidian module in emulate-mobile mode', async () => {
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

    it('should requireAsync an ESM module in emulate-mobile mode', async () => {
      const result = await evalInObsidian({
        args: { dir: SCRIPTS_DIR },
        async fn({ dir }) {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          return (await requireAsync(`//${dir}/module.mjs`)) as Record<string, unknown>;
        },
        vaultPath: vaultPath()
      });

      expect(result).toHaveProperty('value', 'esm-mobile');
    });

    it('should requireAsync a Markdown module in emulate-mobile mode', async () => {
      const result = await evalInObsidian({
        args: { dir: SCRIPTS_DIR },
        async fn({ dir }) {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          return (await requireAsync(`//${dir}/module.md`)) as Record<string, unknown>;
        },
        vaultPath: vaultPath()
      });

      expect(result).toHaveProperty('mdValue', 'mobile-md');
    });

    it('should requireAsync obsidian/app in emulate-mobile mode', async () => {
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

    it('should requireAsync obsidian/specialModuleNames in emulate-mobile mode', async () => {
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

    it('should requireAsync obsidian-dev-utils in emulate-mobile mode', async () => {
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

    it('should resolve relative paths via requireAsync in emulate-mobile mode', async () => {
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

    it('should requireAsync a module via file:/// URL in emulate-mobile mode', async () => {
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

      expect(result).toHaveProperty('value', 'emulate-mobile-ok');
    });

    it('should requireAsync a module via resource URL in emulate-mobile mode', async () => {
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

      expect(result).toHaveProperty('value', 'emulate-mobile-ok');
    });

    it('should requireAsync a module from an HTTP URL in emulate-mobile mode', async () => {
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

    it('should requireAsync @codemirror/state in emulate-mobile mode', async () => {
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
  });

  describe('features unavailable on mobile', () => {
    it('should throw when using synchronous require() in emulate-mobile mode', async () => {
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

    it('should throw when requiring electron module in emulate-mobile mode', async () => {
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

    it('should throw when requiring @electron/remote in emulate-mobile mode', async () => {
      const result = await evalInObsidian({
        async fn() {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          try {
            await requireAsync('@electron/remote');
            return { error: '', threw: false };
          } catch (e: unknown) {
            return { error: (e as Error).message, threw: true };
          }
        },
        vaultPath: vaultPath()
      });

      expect(result.threw).toBe(true);
      expect(result.error).toContain('ASAR packed modules are not available on mobile');
    });

    it('should throw when requiring Node built-in module in emulate-mobile mode', async () => {
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

    it('should return null for crypto module in emulate-mobile mode', async () => {
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
