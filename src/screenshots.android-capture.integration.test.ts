/**
 * @file
 *
 * Produces the five mobile screenshots the community-store listing needs
 * (T461-P21), driving a staged vault in Obsidian Mobile on a real Android
 * emulator and writing `images/screenshots/screenshot-mobile-N.png`.
 *
 * The mobile counterpart of the desktop capture suite, showing the same five
 * beats. It is worth taking rather than reusing the desktop images because the
 * phone is where this plugin's story is least obvious: a reader who assumes
 * "scripting" means "desktop only" is answered by seeing a button run, and a
 * module load, on a phone screen.
 *
 * The module note therefore uses `requireAsync`, NOT `require`: the synchronous
 * form is a desktop capability, and shipping a mobile screenshot of a call that
 * a reader's phone would reject would be a lie told in pixels.
 *
 * There is no mobile equivalent of the desktop viewport override, so the capture
 * is always the device's own framebuffer. The fix is to make the DEVICE the
 * right size: this runs on a dedicated `obsidian_screenshots` AVD built at
 * exactly 900x1600, so the frame already IS the store's size — no crop, no
 * rescale, no letterbox, no post-processing at all.
 *
 * Note the plugin id is `fix-require-modules`, not `codescript-toolkit`: the
 * repo and display name were renamed and the id was not.
 */

import {
  mkdirSync,
  writeFileSync
} from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { sleep as sleepInNode } from 'obsidian-dev-utils/async';
import {
  captureObsidianScreenshot,
  evalInObsidian,
  labelScreenshot,
  readPngDimensions
} from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  beforeAll,
  describe,
  expect,
  it
} from 'vitest';

/**
 * `App`, reduced to the font-size applier that `obsidian-typings` does not
 * declare. Setting `baseFontSize` alone changes nothing on screen.
 */
interface FontSizeApp {
  updateFontSize(this: void): void;
}

/**
 * `App`, reduced to the inline-title applier, likewise undeclared.
 */
interface InlineTitleApp {
  updateInlineTitleDisplay(this: void): void;
}

const WIDTH_IN_PIXELS = 900;
const HEIGHT_IN_PIXELS = 1600;

const PLUGIN_ID = 'fix-require-modules';

const SUBJECT_NOTE_PATH = 'Screenshots/Vault stats.md';

const MODULE_NOTE_PATH = 'Screenshots/Greeting.md';
const MODULE_PATH = 'Screenshots/greeting.ts';

const SCRIPTS_FOLDER = 'Scripts';

/**
 * A fragment of the text the first button prints, used to assert the run
 * actually happened before the result is photographed.
 */
const EXPECTED_RESULT_FRAGMENT = 'markdown notes';

/**
 * A fragment of what the imported module returns, asserted before shot 5 claims
 * the import worked.
 */
const EXPECTED_MODULE_FRAGMENT = 'a TypeScript module';

/**
 * Base font size for the mobile shots.
 *
 * Below Obsidian's own 16px default: the screenshot AVD is a 450x800 dp screen,
 * on which a fenced code block at 16 wraps mid-statement and stops reading as
 * code at all.
 */
const MOBILE_FONT_SIZE_IN_PIXELS = 13;

const IMAGES_DIRECTORY = join(process.cwd(), 'images', 'screenshots');

/**
 * Diagnostics from the setup closure, surfaced by the first test so a failed
 * mobile layout is readable instead of silent.
 */
let setupDiagnostics: unknown;

beforeAll(async () => {
  const vault = getTemporaryVault();

  vault.populate({
    [`.obsidian/plugins/${PLUGIN_ID}/data.json`]: JSON.stringify({
      invocableScriptsFolder: SCRIPTS_FOLDER,
      modulesRoot: '',
      startupScriptPath: `${SCRIPTS_FOLDER}/Warm up.ts`
    }),
    [`${SCRIPTS_FOLDER}/Count words.ts`]: 'export function invoke(): void {\n  console.log(app.workspace.getActiveFile()?.basename);\n}\n',
    [`${SCRIPTS_FOLDER}/Insert date.ts`]: 'export function invoke(): void {\n  console.log(new Date().toISOString());\n}\n',
    [`${SCRIPTS_FOLDER}/Rebuild reading queue.ts`]: 'export function invoke(): void {\n  console.log(\'Rebuilt.\');\n}\n',
    [`${SCRIPTS_FOLDER}/Warm up.ts`]: 'export function invoke(): void {\n  console.log(\'Ready.\');\n}\n',
    [MODULE_NOTE_PATH]: buildModuleNote(),
    [MODULE_PATH]: buildModule(),
    'Projects/Alpha.md': '# Alpha\n',
    'Projects/Beta.md': '# Beta\n',
    'Reading list.md': '# Reading list\n',
    [SUBJECT_NOTE_PATH]: buildSubjectNote()
  });
  await vault.syncToDevice();

  setupDiagnostics = await evalInObsidian({
    async callback({ app, fontSizeInPixels, lib: { waitUntil }, subjectNotePath }) {
      // A closure runs inside ONE Appium `execute/sync` call, which WebDriver
      // Caps around 30s. A longer wait in here dies as an opaque `script
      // Timeout` rather than a readable failure, so keep every wait under it.
      const SETTLE_TIMEOUT_IN_MILLISECONDS = 20_000;
      const SETTLE_DELAY_IN_MILLISECONDS = 1500;

      app.changeTheme('obsidian');

      await waitUntil({
        message: 'the staged note to appear in the vault',
        predicate: () => Boolean(app.vault.getFileByPath(subjectNotePath)),
        timeoutInMilliseconds: SETTLE_TIMEOUT_IN_MILLISECONDS
      });

      app.vault.setConfig('baseFontSize', fontSizeInPixels);
      const fontApp: unknown = app;
      (fontApp as FontSizeApp).updateFontSize();

      // Each note opens with its own `# H1`, so the inline title doubles it.
      app.vault.setConfig('showInlineTitle', false);
      (fontApp as InlineTitleApp).updateInlineTitleDisplay();

      await sleep(SETTLE_DELAY_IN_MILLISECONDS);

      return { isVaultReady: Boolean(app.vault.getFileByPath(subjectNotePath)) };
    },
    input: {
      fontSizeInPixels: MOBILE_FONT_SIZE_IN_PIXELS,
      subjectNotePath: SUBJECT_NOTE_PATH
    },
    vaultPath: vaultPath()
  });

  // No plugin reload here, unlike the desktop suite: on the device the harness
  // Enables the plugin AFTER the vault is synced, so the staged `data.json` is
  // Already in force and the scripts register on their own. Reloading anyway is
  // Worse than redundant — a disable/enable pair mid-session leaves the scripts
  // Unregistered for the rest of the run.
  //
  // Polled from HERE rather than with an in-closure `waitUntil`: registering a
  // Script requires it, which compiles it through babel, and the first one in a
  // Fresh session also loads babel itself. On a phone that runs past the Appium
  // Per-call cap, so the wait has to live outside any single call.
  await waitForScriptCommands();
});

describe('mobile store screenshots', () => {
  it('stages the fixtures the shots are framed on', () => {
    // Surfaced as an assertion because vitest swallows console output from an
    // Integration worker, and a silently-wrong layout produces five bad images
    // Without a single failure.
    expect(setupDiagnostics).toMatchObject({ isVaultReady: true });
  });

  it('1 - runnable snippets sitting in a note', async () => {
    const buttonCount = await openNote('preview', SUBJECT_NOTE_PATH);
    expect(buttonCount).toBeGreaterThan(1);
    await shoot(1, 'Runnable JavaScript and TypeScript, on your phone');
  });

  it('2 - the result of tapping one', async () => {
    const output = await tapFirstButton(EXPECTED_RESULT_FRAGMENT);
    expect(output).toContain(EXPECTED_RESULT_FRAGMENT);
    await shoot(2, 'Tap it and the result appears underneath');
  });

  it('3 - the source that produced it', async () => {
    await openNote('source', SUBJECT_NOTE_PATH);
    await shoot(3, 'Written as a fenced block, versioned with the note');
  });

  it('4 - scripts turned into commands', async () => {
    // Obsidian prefixes a plugin's commands with the plugin name, so the names
    // Are matched as substrings rather than compared whole.
    const registeredNames = await openCommandPalette('Invoke script');
    const commandNames = registeredNames.join('\n');
    expect(commandNames).toContain('Invoke script: Insert date.ts');
    expect(commandNames).toContain('Invoke script: Rebuild reading queue.ts');
    await shoot(4, 'Every script in your folder becomes a command');
  });

  it('5 - a note importing a module from the vault', async () => {
    const output = await runModuleNote();
    expect(output).toContain(EXPECTED_MODULE_FRAGMENT);
    await shoot(5, 'A note can import a TypeScript module living in your vault');
  });
});

/**
 * Builds the TypeScript module the note in shot 5 imports.
 *
 * @returns The module's source.
 */
function buildModule(): string {
  return [
    'export function greet(name: string): string {',
    // eslint-disable-next-line no-template-curly-in-string -- This is the module's source, not a template literal of this file.
    '  return `Hello from a TypeScript module, ${name}`;',
    '}',
    ''
  ].join('\n');
}

/**
 * Builds the note that imports that module.
 *
 * `requireAsync` rather than `require`, because that is the form that works on a
 * phone — see the file comment.
 *
 * @returns The note's Markdown.
 */
function buildModuleNote(): string {
  return [
    '# Greeting',
    '',
    'Split the code out into a module and load it from the note:',
    '',
    '```code-button',
    '---',
    'caption: Greet this vault',
    '---',
    'const { greet } = await requireAsync(\'./greeting.ts\');',
    'greet(\'Obsidian\');',
    '```',
    ''
  ].join('\n');
}

/**
 * Builds the staged note.
 *
 * Two buttons, because one looks like a toy: the first reads the vault through
 * the Obsidian API, the second is TypeScript with a type annotation that plain
 * JavaScript would reject — which is the claim the plugin makes.
 *
 * Assembled from an array so the fenced blocks survive being written inside a
 * TypeScript file.
 *
 * @returns The note's Markdown.
 */
function buildSubjectNote(): string {
  return [
    '# Vault stats',
    '',
    'A script belongs beside the note that explains it:',
    '',
    '```code-button',
    '---',
    'caption: Count the notes in this vault',
    '---',
    'const count = app.vault.getMarkdownFiles().length;',
    // eslint-disable-next-line no-template-curly-in-string -- This is the note's source, not a template literal of this file.
    '`This vault has ${count} markdown notes`;',
    '```',
    '',
    'TypeScript works too, types and all:',
    '',
    '```code-button',
    '---',
    'caption: Longest chapter title',
    '---',
    'interface Chapter {',
    '  title: string;',
    '  words: number;',
    '}',
    '',
    'const chapters: Chapter[] = [',
    '  { title: \'The long way round\', words: 1840 },',
    '  { title: \'Home\', words: 620 }',
    '];',
    '',
    'chapters.sort((left, right) => right.words - left.words)[0]?.title;',
    '```',
    ''
  ].join('\n');
}

/**
 * Opens the command palette and filters it to the invocable-script commands.
 *
 * @param query - What to type into the palette.
 * @returns The names of the commands the staged scripts registered.
 */
async function openCommandPalette(query: string): Promise<string[]> {
  return await evalInObsidian({
    async callback({ app, lib: { waitUntil }, query: text }) {
      const PALETTE_TIMEOUT_IN_MILLISECONDS = 15_000;
      const SETTLE_DELAY_IN_MILLISECONDS = 1200;

      app.commands.executeCommandById('command-palette:open');

      await waitUntil({
        message: 'the command palette to open',
        predicate: () => Boolean(document.querySelector('.prompt input')),
        timeoutInMilliseconds: PALETTE_TIMEOUT_IN_MILLISECONDS
      });

      const input = document.querySelector('.prompt input');
      if (!(input instanceof HTMLInputElement)) {
        throw new TypeError('The command palette has no input.');
      }

      input.value = text;
      // The palette filters from its own input handler, so setting the value
      // Alone would leave every command in the vault on screen.
      input.dispatchEvent(new Event('input'));

      await sleep(SETTLE_DELAY_IN_MILLISECONDS);

      return Object.values(app.commands.commands)
        .filter((command) => command.id.includes('invoke-script-file-'))
        .map((command) => command.name);
    },
    input: { query },
    vaultPath: vaultPath()
  });
}

/**
 * Opens a staged note in the given mode.
 *
 * @param mode - `preview` to render the buttons, `source` to show the blocks.
 * @param notePath - Vault-relative path of the note.
 * @returns How many code buttons are on screen.
 */
async function openNote(mode: string, notePath: string): Promise<number> {
  return await evalInObsidian({
    async callback({ app, lib: { waitUntil }, mode: viewMode, notePath: path }) {
      const RENDER_TIMEOUT_IN_MILLISECONDS = 20_000;
      const SETTLE_DELAY_IN_MILLISECONDS = 1500;

      // A previous shot may have left the command palette on top of the note.
      // `pressKey` is Electron-only, so a phone gets a synthetic key event.
      if (document.querySelector('.prompt')) {
        document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }));
        await sleep(SETTLE_DELAY_IN_MILLISECONDS);
      }

      // Only the on-screen copies count — Obsidian leaves the note's previous
      // Render in the document, detached and zero-sized.
      function countVisibleButtons(): number {
        return [...document.querySelectorAll('.fix-require-modules-run-button')]
          .filter((element) => element.getBoundingClientRect().width > 0).length;
      }

      const file = app.vault.getFileByPath(path);
      if (!file) {
        throw new Error(`Note is missing from the vault: ${path}`);
      }

      const leaf = app.workspace.getLeaf(false);
      await leaf.openFile(file);
      await leaf.setViewState({
        state: { file: path, mode: viewMode, source: viewMode === 'source' },
        type: 'markdown'
      });

      if (viewMode === 'preview') {
        await waitUntil({
          message: 'the code buttons to render',
          predicate: () => countVisibleButtons() > 0,
          timeoutInMilliseconds: RENDER_TIMEOUT_IN_MILLISECONDS
        });
      } else {
        await waitUntil({
          message: 'the editor to render',
          predicate: () => Boolean(document.querySelector('.cm-content')),
          timeoutInMilliseconds: RENDER_TIMEOUT_IN_MILLISECONDS
        });
      }

      await sleep(SETTLE_DELAY_IN_MILLISECONDS);

      return countVisibleButtons();
    },
    input: { mode, notePath },
    vaultPath: vaultPath()
  });
}

/**
 * Opens the note that imports a vault module and runs its button.
 *
 * @returns The text the run produced.
 */
async function runModuleNote(): Promise<string> {
  const buttonCount = await openNote('preview', MODULE_NOTE_PATH);
  if (buttonCount !== 1) {
    throw new Error(`Expected one code button in the module note, found ${String(buttonCount)}.`);
  }

  return await tapFirstButton(EXPECTED_MODULE_FRAGMENT);
}

/**
 * Captures the device screen, captions it, and writes it as
 * `images/screenshots/screenshot-mobile-<index>.png`.
 *
 * @param index - The 1-based listing position.
 * @param caption - The caption drawn across the bottom of the frame.
 */
async function shoot(index: number, caption: string): Promise<void> {
  const captured = await captureObsidianScreenshot({ vaultPath: vaultPath() });

  // The AVD is 900x1600, so the device frame IS the store's size. Asserting it
  // Here is what keeps that true: run this against any other AVD and it fails
  // Loudly instead of quietly shipping an off-spec image.
  expect(readPngDimensions(captured)).toStrictEqual({
    heightInPixels: HEIGHT_IN_PIXELS,
    widthInPixels: WIDTH_IN_PIXELS
  });

  // Captioned AFTER capture, so the frame stays an untouched device screenshot
  // And rewording a label needs no re-shoot.
  const labeled = await labelScreenshot(captured, { text: caption });

  mkdirSync(IMAGES_DIRECTORY, { recursive: true });
  writeFileSync(join(IMAGES_DIRECTORY, `screenshot-mobile-${String(index)}.png`), labeled);
}

/**
 * Taps the first on-screen code button and waits for its results panel to fill.
 *
 * @param expectedResultFragment - Text the run must produce.
 * @returns The text the run produced.
 */
async function tapFirstButton(expectedResultFragment: string): Promise<string> {
  return await evalInObsidian({
    async callback({ expectedFragment, lib: { waitUntil } }) {
      const RUN_TIMEOUT_IN_MILLISECONDS = 20_000;
      const SETTLE_DELAY_IN_MILLISECONDS = 1500;

      function isOnScreen(element: Element): boolean {
        return element.getBoundingClientRect().width > 0;
      }

      const button = [...document.querySelectorAll('.fix-require-modules-run-button')].find((element) => isOnScreen(element));
      if (!(button instanceof HTMLElement)) {
        throw new TypeError('No visible code button rendered in the note.');
      }

      function readVisiblePanels(): string[] {
        return [...document.querySelectorAll('.fix-require-modules.console-log-container')]
          .filter((panel) => isOnScreen(panel))
          .map((panel) => panel.textContent);
      }

      button.click();

      await waitUntil({
        message: 'the visible results panel to show what the script returned',
        predicate: () => readVisiblePanels().some((text) => text.includes(expectedFragment)),
        timeoutInMilliseconds: RUN_TIMEOUT_IN_MILLISECONDS
      });

      await sleep(SETTLE_DELAY_IN_MILLISECONDS);

      return readVisiblePanels().join(' ');
    },
    input: { expectedFragment: expectedResultFragment },
    vaultPath: vaultPath()
  });
}

function vaultPath(): string {
  return getTemporaryVault().path;
}

/**
 * Waits, from the Node side, for the staged scripts to register as commands.
 *
 * @throws When they have not registered within the deadline.
 */
async function waitForScriptCommands(): Promise<void> {
  const ATTEMPTS = 30;
  const INTERVAL_IN_MILLISECONDS = 4000;

  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const count = await evalInObsidian({
      callback({ app }) {
        return Object.keys(app.commands.commands).filter((id) => id.includes('invoke-script-file-')).length;
      },
      vaultPath: vaultPath()
    });

    if (count > 2) {
      return;
    }

    await sleepInNode({ milliseconds: INTERVAL_IN_MILLISECONDS });
  }

  throw new Error('The staged scripts never registered as commands.');
}
