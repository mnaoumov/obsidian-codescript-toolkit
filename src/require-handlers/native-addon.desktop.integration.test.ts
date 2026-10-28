import { ensureNonNullable } from '@mnaoumov/typescript-lib/type-guards';
import { createRequire } from 'node:module';
import { evalInObsidian } from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  beforeAll,
  describe,
  expect,
  it
} from 'vitest';

import type {
  requireAsync,
  RequireExFunction
} from '../types.ts';

import { CacheInvalidationMode } from '../types.ts';

interface NativeAddon {
  readonly libvipsVersion: () => NativeVersion;
}

interface NativeVersion {
  readonly semver: string;
}

const nativeRequire = createRequire(import.meta.url);
const SCRIPTS_DIRECTORY = '_native-addon-tests';
let nativeAddonPath: string;
let expectedVersion: string;

beforeAll(() => {
  // Sharp is already a development dependency and ships a real Node-API addon.
  // Keep it beside its bundled libraries so loading also works outside Windows.
  nativeRequire('sharp');
  nativeAddonPath = ensureNonNullable(Object.keys(nativeRequire.cache).find((path) => path.endsWith('.node') && path.includes('sharp')));
  expectedVersion = (nativeRequire(nativeAddonPath) as NativeAddon).libvipsVersion().semver;
  getTemporaryVault().populate({
    [`${SCRIPTS_DIRECTORY}/index.cjs`]: `module.exports = require(${JSON.stringify(nativeAddonPath.replaceAll('\\', '/'))});`
  });
});

describe('native addon loading', () => {
  it('should initialize a native addon when Node and the toolkit share its cache key', async () => {
    const result = await evalInObsidian({
      callback({ addonPath, cacheInvalidationMode }) {
        const requireFunction = Reflect.get(window, 'require') as RequireExFunction;
        const path = addonPath.replaceAll('\\', '/');
        const nativePath = requireFunction.resolve(path);
        const cache = requireFunction.cache;
        const originalDescriptor = Object.getOwnPropertyDescriptor(cache, nativePath);
        if (nativePath !== path) {
          // Windows uses backslashes in Node's cache. Alias that key to the
          // toolkit's key so the real native loader encounters POSIX's collision.
          Object.defineProperty(cache, nativePath, {
            configurable: true,
            enumerable: true,
            get(): NodeJS.Module | undefined {
              return cache[path];
            },
            set($module: NodeJS.Module) {
              cache[path] = $module;
            }
          });
        }
        try {
          const addon = requireFunction(path, { cacheInvalidationMode }) as NativeAddon;
          return addon.libvipsVersion().semver;
        } finally {
          if (nativePath !== path) {
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- Restore the native cache key after the POSIX simulation.
            delete cache[nativePath];
            if (originalDescriptor) {
              Object.defineProperty(cache, nativePath, originalDescriptor);
            }
          }
        }
      },
      input: { addonPath: nativeAddonPath, cacheInvalidationMode: CacheInvalidationMode.Always },
      vaultPath: getTemporaryVault().path
    });

    expect(result).toBe(expectedVersion);
  });

  it.each(['require', 'requireAsync', 'module', 'nested'] as const)('should expose working native functions through %s', async (mode) => {
    const result = await evalInObsidian({
      async callback({ addonPath, cacheInvalidationMode, directory, loadingMode }) {
        const options = { cacheInvalidationMode };
        const requireFunction = Reflect.get(window, 'require') as RequireExFunction;
        const requireAsyncFunction = Reflect.get(window, 'requireAsync') as typeof requireAsync;
        const path = addonPath.replaceAll('\\', '/');
        let addon: NativeAddon;
        switch (loadingMode) {
          case 'module': {
            addon = window.module.require(path) as NativeAddon;
            break;
          }
          case 'nested': {
            addon = requireFunction(`//${directory}/index.cjs`, options) as NativeAddon;
            break;
          }
          case 'require': {
            addon = requireFunction(path, options) as NativeAddon;
            break;
          }
          case 'requireAsync': {
            addon = await requireAsyncFunction(path, options) as NativeAddon;
            break;
          }
          default: {
            throw new Error('Unknown native addon loading mode.');
          }
        }
        return {
          hasSameCachedExports: requireFunction(path, options) === addon,
          version: addon.libvipsVersion().semver
        };
      },
      input: { addonPath: nativeAddonPath, cacheInvalidationMode: CacheInvalidationMode.Never, directory: SCRIPTS_DIRECTORY, loadingMode: mode },
      vaultPath: getTemporaryVault().path
    });

    expect(result.version).toBe(expectedVersion);
    expect(result.hasSameCachedExports).toBe(true);
  });
});
