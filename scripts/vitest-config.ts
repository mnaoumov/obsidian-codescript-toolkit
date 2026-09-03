import type { ObsidianPluginVitestConfigContext } from 'obsidian-dev-utils/script-utils/test-runners/vitest-config';
import type {
  TestProjectConfiguration,
  ViteUserConfig
} from 'vitest/config';

import { defineObsidianPluginVitestConfig } from 'obsidian-dev-utils/script-utils/test-runners/vitest-config';

/**
 * The screenshot-capture suites (T461-P21) that write
 * `images/screenshots/screenshot-*.png`.
 *
 * They are named `*.desktop-capture.` / `*.android-capture.` rather than
 * `*.desktop.` / `*.android.` so they match NONE of the standard project globs.
 * That keeps them out of `npm run test:integration` entirely — capturing is an
 * explicit operation (`npm run capture:screenshots`), not something every test
 * run does. Folding them into the standard projects would rewrite ten PNGs on
 * every run and dirty the tree mid-release.
 */
const DESKTOP_CAPTURE_TEST_FILES = 'src/**/*.desktop-capture.integration.test.ts';
const ANDROID_CAPTURE_TEST_FILES = 'src/**/*.android-capture.integration.test.ts';

/**
 * The AVD the mobile shots are taken on: 900x1600 at density 320, which is
 * exactly the size the community store asks for, so the capture needs no crop,
 * no rescale and no letterbox. The shared `obsidian_test` AVD is a Pixel 10 Pro
 * XL at 1344x2994 (~9:20) and cannot produce it; resizing that one at runtime
 * destroys the Appium session, because the display change recreates the
 * activity and with it the WebView the session is attached to.
 *
 * Needs one-time provisioning — see [[T461-P21]].
 */
const SCREENSHOT_AVD_NAME = 'obsidian_screenshots';

const APPIUM_URL = 'http://localhost:4723';

/**
 * This AVD is cold-booted and rarely used, so Obsidian's first layout on it is
 * far slower than on the well-warmed shared one; the 90s default expires while
 * it is still starting up.
 */
const LAYOUT_READY_TIMEOUT_IN_MILLISECONDS = 240_000;

/**
 * The demo-vault suites. They drive a real desktop Obsidian like the desktop project, but against a
 * populated copy of the in-repo `demo-vault/` rather than an empty vault — hence their own
 * `globalSetup` — and need their own suffix so the desktop project does not also collect them and open
 * them against a vault with no notes in it.
 *
 * `test-integration.ts` has always asked for this project by name. Until it was declared here it
 * matched nothing, so `vitest` failed the run with `No projects matched the filter` and both
 * `*.demo-vault.integration.test.ts` files were collected by nothing at all — the same shape of
 * silent gap as [[T518-P17]], from the opposite direction.
 */
const DEMO_VAULT_TEST_FILES = 'src/**/*.demo-vault.integration.test.ts';

/**
 * One `it` per note clicks every button in that note, and this vault's notes carry more buttons than
 * any other — the desktop project's 30s default is nowhere near enough.
 */
const DEMO_VAULT_TIMEOUT_IN_MILLISECONDS = 600_000;

/**
 * Drops the root-level `test.include` the shared config declares, so every project collects only what
 * its own `include` names.
 *
 * `defineObsidianPluginVitestConfig` sets a root-level `include: ['src/**\/*.test.ts']` as well as a
 * per-project one. Under vitest 4 the project glob replaced the root glob; under vitest 5 it no longer
 * does, and the root glob is a superset of every project glob — so on vitest `5.0.0` EVERY project
 * collected ALL 63 `src/**\/*.test.ts` files in this repo rather than the 0-9 its own `include` names.
 * That is not a cosmetic widening:
 *
 * - the capture suites ran and rewrote the five checked-in `images/screenshots/screenshot-desktop-*.png`,
 *   which is precisely what naming them `*.desktop-capture.` was meant to prevent;
 * - ~21 unit suites failed to import on `Failed to resolve entry for package "obsidian"`, correctly —
 *   `obsidian` is types-only, and only the `unit-tests` project aliases it to `obsidian-test-mocks`;
 * - the Android and demo-vault suites ran under the desktop transport, reporting failures that were pure
 *   mis-routing.
 *
 * With the root glob gone the seven projects partition the 63 files exactly (47 + 1 + 9 + 0 + 2 + 1 + 1).
 *
 * This is a REPO-LOCAL workaround for a defect `obsidian-dev-utils` owns: its root `test` block only
 * needs `coverage`, `exclude`, `globals` and `passWithNoTests`, and the `unit-tests` project already
 * declares the same glob for itself. Drop this wrapper once the library stops declaring the root-level
 * `include`; until then it is what makes an integration run readable here.
 *
 * @param vitestConfig - The configuration the shared factory returned.
 * @returns The same configuration, with its root-level `include` removed.
 */
function dropRootInclude(vitestConfig: ViteUserConfig): ViteUserConfig {
  delete vitestConfig.test?.include;
  return vitestConfig;
}

export const config = dropRootInclude(defineObsidianPluginVitestConfig({
  customProjects(context: ObsidianPluginVitestConfigContext): TestProjectConfiguration[] {
    return [
      {
        test: {
          ...context.desktop,
          include: [DESKTOP_CAPTURE_TEST_FILES],
          name: 'capture-screenshots:desktop'
        }
      },
      {
        test: {
          ...context.android,
          environmentOptions: {
            obsidianTransport: {
              appiumUrl: APPIUM_URL,
              avdName: SCREENSHOT_AVD_NAME,
              layoutReadyTimeoutInMilliseconds: LAYOUT_READY_TIMEOUT_IN_MILLISECONDS,
              type: 'obsidian-android-appium'
            }
          },
          include: [ANDROID_CAPTURE_TEST_FILES],
          name: 'capture-screenshots:android'
        }
      },
      {
        test: {
          ...context.desktop,
          globalSetup: ['./scripts/demo-vault-global-setup.ts'],
          include: [DEMO_VAULT_TEST_FILES],
          name: 'integration-tests:demo-vault',
          testTimeout: DEMO_VAULT_TIMEOUT_IN_MILLISECONDS
        }
      }
    ];
  }
}));
