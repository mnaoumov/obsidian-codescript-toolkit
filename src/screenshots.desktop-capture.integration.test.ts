/**
 * @file
 *
 * Produces the desktop screenshots the community-store listing needs
 * (T461-P21), driving a staged note in a real Obsidian and writing
 * `images/screenshots/screenshot-desktop-N.png`.
 *
 * FIVE shots: a runnable snippet sitting in a note, the result it produces when
 * clicked, the source that produced it, the vault's scripts showing up as
 * Obsidian commands, and a note importing a TypeScript module from the vault.
 *
 * The buttons are really clicked and the results panel is really filled — shots
 * 2 and 5 assert the output text before photographing it, so a button that
 * silently failed cannot be shipped as a working one.
 *
 * There is no settings shot: the settings modal cannot be opened from a capture
 * run at all (`app.setting.open()` returns without attaching anything to the
 * document). One of the sibling plugins' capture suites records the whole
 * finding, including the CDP-level verification behind it.
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
 * `App`, reduced to the inline-title toggle that `obsidian-typings` does not
 * declare. Setting the config alone changes nothing on screen.
 */
interface InlineTitleApp {
  updateInlineTitleDisplay(this: void): void;
}

/**
 * The desktop side dock, reduced to the resize call.
 */
interface ResizableSideDock {
  setSize(this: void, size: number): void;
}

const WIDTH_IN_PIXELS = 1200;
const HEIGHT_IN_PIXELS = 800;

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

const IMAGES_DIRECTORY = join(process.cwd(), 'images', 'screenshots');

beforeAll(async () => {
  const vault = getTemporaryVault();

  vault.populate({
    // Points the plugin at the staged scripts folder, so shots 4 and 5 have
    // Something real to show. Written before the reload below, which is what
    // Makes the plugin read it.
    [`.obsidian/plugins/${PLUGIN_ID}/data.json`]: JSON.stringify({
      invocableScriptsFolder: SCRIPTS_FOLDER,
      modulesRoot: '',
      startupScriptPath: `${SCRIPTS_FOLDER}/Warm up.ts`
    }),
    [`${SCRIPTS_FOLDER}/Count words.ts`]: 'export function invoke(): void {\n  console.log(app.workspace.getActiveFile()?.basename);\n}\n',
    [`${SCRIPTS_FOLDER}/Insert date.ts`]: 'export function invoke(): void {\n  console.log(new Date().toISOString());\n}\n',
    // `buildInvokeCommand` is how a script asks for its own hotkey — the palette
    // Then shows the chip, which is the point of shot 4.
    [`${SCRIPTS_FOLDER}/Rebuild reading queue.ts`]: 'export function buildInvokeCommand(): unknown {\n  return {\n    callback: (): void => {\n      console.log(\'Rebuilt.\');\n    },\n    hotkeys: [{ key: \'F9\', modifiers: [\'Ctrl\', \'Shift\'] }]\n  };\n}\n',
    [`${SCRIPTS_FOLDER}/Warm up.ts`]: 'export function invoke(): void {\n  console.log(\'Ready.\');\n}\n',
    [MODULE_NOTE_PATH]: buildModuleNote(),
    [MODULE_PATH]: buildModule(),
    'Projects/Alpha.md': '# Alpha\n',
    'Projects/Beta.md': '# Beta\n',
    'Reading list.md': '# Reading list\n',
    [SUBJECT_NOTE_PATH]: buildSubjectNote()
  });
  await vault.syncToDevice();

  await evalInObsidian({
    async callback({ app, lib: { waitUntil }, subjectNotePath }) {
      const SETTLE_TIMEOUT_IN_MILLISECONDS = 20_000;
      const SETTLE_DELAY_IN_MILLISECONDS = 1000;

      app.changeTheme('obsidian');

      await waitUntil({
        message: 'the staged note to appear in the vault',
        predicate: () => Boolean(app.vault.getFileByPath(subjectNotePath)),
        timeoutInMilliseconds: SETTLE_TIMEOUT_IN_MILLISECONDS
      });

      // The note is the subject; the file explorer and an empty right dock would
      // Otherwise take a third of a 1200x800 frame.
      app.workspace.leftSplit.collapse();
      const rightSplit: unknown = app.workspace.rightSplit;
      (rightSplit as ResizableSideDock).setSize(0);
      app.workspace.rightSplit.collapse();

      app.vault.setConfig('showInlineTitle', false);
      const inlineTitleApp: unknown = app;
      (inlineTitleApp as InlineTitleApp).updateInlineTitleDisplay();

      await sleep(SETTLE_DELAY_IN_MILLISECONDS);
    },
    input: { subjectNotePath: SUBJECT_NOTE_PATH },
    vaultPath: vaultPath()
  });

  // A SEPARATE closure, because one `evalInObsidian` call is one CDP
  // `Runtime.evaluate`, which the transport caps at 30 seconds — and a plugin
  // Reload that has to compile the staged scripts can eat most of that on its
  // Own. Folded into the closure above, the whole setup times out.
  await evalInObsidian({
    async callback({ app, lib: { waitUntil }, pluginId }) {
      const SCRIPT_REGISTRATION_TIMEOUT_IN_MILLISECONDS = 20_000;

      // The plugin reads the settings and scans the scripts folder on load, so
      // The staged `data.json` only takes effect after a reload.
      await app.plugins.disablePlugin(pluginId);
      await app.plugins.enablePlugin(pluginId);

      await waitUntil({
        message: 'the staged scripts to register as commands',
        predicate: () => Object.keys(app.commands.commands).filter((id) => id.includes('invoke-script-file-')).length > 2,
        timeoutInMilliseconds: SCRIPT_REGISTRATION_TIMEOUT_IN_MILLISECONDS
      });
    },
    input: { pluginId: PLUGIN_ID },
    vaultPath: vaultPath()
  });
});

describe('desktop store screenshots', () => {
  it('1 - runnable snippets sitting in a note', async () => {
    const buttonCount = await openNote('preview', SUBJECT_NOTE_PATH);
    expect(buttonCount).toBeGreaterThan(1);
    await shoot(1, 'Runnable JavaScript and TypeScript, right in the note');
  });

  it('2 - the result of clicking one', async () => {
    const output = await clickFirstButton(EXPECTED_RESULT_FRAGMENT);
    expect(output).toContain(EXPECTED_RESULT_FRAGMENT);
    await shoot(2, 'Click it and the result appears underneath');
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
    await shoot(4, 'Every script in your folder becomes a command, hotkey and all');
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
 * A plain `.ts` file sitting in the vault beside the note, with a typed
 * signature no plain-JavaScript runtime would accept.
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
 * @returns The note's Markdown.
 */
function buildModuleNote(): string {
  return [
    '# Greeting',
    '',
    'Split the code out into a module and `require` it from the note:',
    '',
    '```code-button',
    '---',
    'caption: Greet this vault',
    '---',
    'const { greet } = require(\'./greeting.ts\');',
    // Not `app.vault.getName()`: the capture runs in a throwaway vault, and its
    // Generated name would be the most prominent word in the frame.
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
 * Clicks the first code button and waits for its results panel to fill.
 *
 * @returns The text the run produced.
 */
async function clickFirstButton(expectedResultFragment: string): Promise<string> {
  return await evalInObsidian({
    async callback({ expectedFragment, lib: { waitUntil } }) {
      const RUN_TIMEOUT_IN_MILLISECONDS = 20_000;
      const SETTLE_DELAY_IN_MILLISECONDS = 1500;

      // Obsidian keeps the note's PREVIOUS render in the document, detached: half
      // The buttons and results panels on the page are leftovers that occupy no
      // Space. Clicking one of those fills a panel nobody can see, which is what
      // This shot did until it started filtering by on-screen size — the panel in
      // The frame stayed empty while the assertion happily read the hidden one.
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
      const RESIZE_SETTLE_DELAY_IN_MILLISECONDS = 2000;

      await sleep(RESIZE_SETTLE_DELAY_IN_MILLISECONDS);

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
 * Opens the staged note in the given mode.
 *
 * @param mode - `preview` to render the buttons, `source` to show the blocks.
 * @returns How many code buttons rendered.
 */
async function openNote(mode: string, notePath: string): Promise<number> {
  return await evalInObsidian({
    async callback({ app, lib: { pressKey, waitUntil }, mode: viewMode, subjectNotePath }) {
      const RENDER_TIMEOUT_IN_MILLISECONDS = 20_000;
      const SETTLE_DELAY_IN_MILLISECONDS = 1500;
      const RESIZE_SETTLE_DELAY_IN_MILLISECONDS = 2000;

      // Let the previous shot's capture settle: the device-metrics override it
      // Sets and clears disturbs anything driven too soon afterwards.
      await sleep(RESIZE_SETTLE_DELAY_IN_MILLISECONDS);

      // A previous shot may have left the command palette on top of the note.
      if (document.querySelector('.prompt')) {
        pressKey({ key: 'Escape' });
        await sleep(SETTLE_DELAY_IN_MILLISECONDS);
      }

      // Only the on-screen copies count — Obsidian leaves the note's previous
      // Render in the document, detached and zero-sized.
      function countVisibleButtons(): number {
        return [...document.querySelectorAll('.fix-require-modules-run-button')]
          .filter((element) => element.getBoundingClientRect().width > 0).length;
      }

      const file = app.vault.getFileByPath(subjectNotePath);
      if (!file) {
        throw new Error(`Note is missing from the vault: ${subjectNotePath}`);
      }

      const leaf = app.workspace.getLeaf(false);
      await leaf.openFile(file);
      await leaf.setViewState({
        state: { file: subjectNotePath, mode: viewMode, source: viewMode === 'source' },
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
    input: { mode, subjectNotePath: notePath },
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

  return await clickFirstButton(EXPECTED_MODULE_FRAGMENT);
}

/**
 * Captures the window, captions it, and writes it as
 * `images/screenshots/screenshot-desktop-<index>.png`.
 *
 * @param index - The 1-based listing position.
 * @param caption - The caption drawn across the bottom of the frame.
 */
async function shoot(index: number, caption: string): Promise<void> {
  const bytes = await captureObsidianScreenshot({
    heightInPixels: HEIGHT_IN_PIXELS,
    vaultPath: vaultPath(),
    widthInPixels: WIDTH_IN_PIXELS
  });

  const labeled = await labelScreenshot(bytes, { text: caption });

  expect(readPngDimensions(labeled)).toStrictEqual({
    heightInPixels: HEIGHT_IN_PIXELS,
    widthInPixels: WIDTH_IN_PIXELS
  });

  mkdirSync(IMAGES_DIRECTORY, { recursive: true });
  writeFileSync(join(IMAGES_DIRECTORY, `screenshot-desktop-${String(index)}.png`), labeled);
}

function vaultPath(): string {
  return getTemporaryVault().path;
}
