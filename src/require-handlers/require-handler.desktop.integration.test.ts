import {
  evalInObsidian,
  TempVault
} from 'obsidian-integration-testing';
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it
} from 'vitest';

interface PluginSettingsComponentLike {
  settings: Record<string, unknown>;
}

type RequireAsyncFn = (id: string, options?: Record<string, unknown>) => Promise<unknown>;
type RequireAsyncWrapperFn = (fn: (require: (id: string, options?: Record<string, unknown>) => unknown) => unknown) => Promise<unknown>;

const MODULES_ROOT = '_scripts';
const PLUGIN_ID = 'fix-require-modules';

let vault: TempVault;

beforeAll(async () => {
  vault = new TempVault();

  vault.populate({
    [`${MODULES_ROOT}/module.cjs`]: 'exports.value = 42;',
    [`${MODULES_ROOT}/module.cts`]: 'exports.value = \'cts-\' + (1 + 2).toString();',
    [`${MODULES_ROOT}/module.json`]: JSON.stringify({ key: 'val', num: 7 }),
    [`${MODULES_ROOT}/module.md`]: [
      '```code-script',
      'export const mdValue = "from-markdown";',
      '```'
    ].join('\n'),
    [`${MODULES_ROOT}/module.mjs`]: 'export const value = \'esm-ok\';',
    [`${MODULES_ROOT}/module.mts`]: 'export const value: string = \'mts-ok\';',
    [`${MODULES_ROOT}/nested/child.cjs`]: 'exports.child = true;',
    [`${MODULES_ROOT}/relative-parent.cjs`]: 'const child = require(\'./nested/child.cjs\'); exports.childValue = child.child;',
    [`${MODULES_ROOT}/top-level-await.mjs`]: 'const x = await Promise.resolve(99); export { x };'
  });

  await vault.register();

  await evalInObsidian({
    args: { modulesRoot: MODULES_ROOT, pluginId: PLUGIN_ID },
    fn({ app, modulesRoot, pluginId }) {
      const plugin = app.plugins.plugins[pluginId];
      if (!plugin) {
        throw new Error(`Plugin ${pluginId} not found`);
      }

      const settingsComponent = Reflect.get(plugin, 'pluginSettingsComponent') as PluginSettingsComponentLike;
      settingsComponent.settings['modulesRoot'] = modulesRoot;
    },
    vaultPath: vault.path
  });
});

afterAll(async () => {
  await vault.dispose();
});

describe('RequireHandler integration', () => {
  describe('module formats', () => {
    it('should require a CJS module', async () => {
      const result = await evalInObsidian({
        async fn() {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          return (await requireAsync('/module.cjs')) as Record<string, unknown>;
        },
        vaultPath: vault.path
      });

      expect(result).toHaveProperty('value', 42);
    });

    it('should require an ESM module', async () => {
      const result = await evalInObsidian({
        async fn() {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          return (await requireAsync('/module.mjs')) as Record<string, unknown>;
        },
        vaultPath: vault.path
      });

      expect(result).toHaveProperty('value', 'esm-ok');
    });

    it('should require a TypeScript CTS module', async () => {
      const result = await evalInObsidian({
        async fn() {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          return (await requireAsync('/module.cts')) as Record<string, unknown>;
        },
        vaultPath: vault.path
      });

      expect(result).toHaveProperty('value', 'cts-3');
    });

    it('should require a TypeScript MTS module', async () => {
      const result = await evalInObsidian({
        async fn() {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          return (await requireAsync('/module.mts')) as Record<string, unknown>;
        },
        vaultPath: vault.path
      });

      expect(result).toHaveProperty('value', 'mts-ok');
    });

    it('should require a JSON module', async () => {
      const result = await evalInObsidian({
        async fn() {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          return (await requireAsync('/module.json')) as Record<string, unknown>;
        },
        vaultPath: vault.path
      });

      expect(result).toEqual({ key: 'val', num: 7 });
    });

    it('should require a Markdown module with code-script block', async () => {
      const result = await evalInObsidian({
        async fn() {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          return (await requireAsync('/module.md')) as Record<string, unknown>;
        },
        vaultPath: vault.path
      });

      expect(result).toHaveProperty('mdValue', 'from-markdown');
    });
  });

  describe('path resolution', () => {
    it('should resolve relative paths with parentPath option', async () => {
      const result = await evalInObsidian({
        args: { modulesRoot: MODULES_ROOT },
        async fn({ modulesRoot }) {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          return (await requireAsync('./nested/child.cjs', {
            parentPath: `${modulesRoot}/relative-parent.cjs`
          })) as Record<string, unknown>;
        },
        vaultPath: vault.path
      });

      expect(result).toHaveProperty('child', true);
    });

    it('should resolve transitive require chains', async () => {
      const result = await evalInObsidian({
        async fn() {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          return (await requireAsync('/relative-parent.cjs')) as Record<string, unknown>;
        },
        vaultPath: vault.path
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
        vaultPath: vault.path
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
        vaultPath: vault.path
      });

      expect(result.hasEditorState).toBe(true);
    });
  });

  describe('async features', () => {
    it('should support top-level await in requireAsync', async () => {
      const result = await evalInObsidian({
        async fn() {
          const requireAsync = Reflect.get(window, 'requireAsync') as RequireAsyncFn;
          return (await requireAsync('/top-level-await.mjs')) as Record<string, unknown>;
        },
        vaultPath: vault.path
      });

      expect(result).toHaveProperty('x', 99);
    });

    it('should support requireAsyncWrapper', async () => {
      const result = await evalInObsidian({
        async fn() {
          const requireAsyncWrapper = Reflect.get(window, 'requireAsyncWrapper') as RequireAsyncWrapperFn;
          return (await requireAsyncWrapper((require) => {
            // eslint-disable-next-line import-x/no-absolute-path -- vault-root-relative path, not filesystem absolute
            const mod = require('/module.cjs') as Record<string, unknown>;
            return mod['value'];
          })) as number;
        },
        vaultPath: vault.path
      });

      expect(result).toBe(42);
    });
  });
});
