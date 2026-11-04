import {
  parseVersionArguments,
  updateVersion
} from '@mnaoumov/obsidian-dev-toolkit/version';
import { wrapCliTask } from '@mnaoumov/typescript-dev-toolkit/cli-utils';
import process from 'node:process';

/**
 * Obsidian's own feed of desktop releases. Its `latestVersion` is the newest PUBLIC build; Catalyst builds are listed
 * separately under `beta`, so they are never picked here.
 */
const DESKTOP_RELEASES_JSON_URL = 'https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/desktop-releases.json';

interface DesktopReleases {
  readonly latestVersion?: unknown;
}

// TODO: Remove once `@mnaoumov/obsidian-dev-toolkit` restores the latest public Obsidian as its default minimum.
// The installed toolkit keeps the manifest's `minAppVersion` unless one is passed, and this plugin supports only the
// latest public Obsidian, so every release resolves that version here and passes it explicitly.
async function getLatestPublicObsidianVersion(): Promise<string> {
  const response = await fetch(DESKTOP_RELEASES_JSON_URL);
  if (!response.ok) {
    throw new Error(`Could not read ${DESKTOP_RELEASES_JSON_URL}: HTTP ${String(response.status)}. Pass --min-app-version to release anyway.`);
  }

  const { latestVersion } = await response.json() as DesktopReleases;
  if (typeof latestVersion !== 'string' || !/^\d+\.\d+\.\d+$/.test(latestVersion)) {
    throw new Error(`${DESKTOP_RELEASES_JSON_URL} has no valid latestVersion. Pass --min-app-version to release anyway.`);
  }

  return latestVersion;
}

const [, , ...$arguments] = process.argv;
const { options, versionUpdateType } = parseVersionArguments($arguments);
await wrapCliTask(async () => {
  const minAppVersion = options.minAppVersion ?? await getLatestPublicObsidianVersion();
  await updateVersion(versionUpdateType, { ...options, minAppVersion });
});
