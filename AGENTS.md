# AGENTS.md

## The demo vault IS the documentation

There is no separate prose documentation. `demo-vault/` is the plugin's documentation, read either in Obsidian (where the buttons run) or on GitHub (where it is plain markdown). `docs/` still exists, but every page there is a one-line redirect stub — kept permanently so no `blob/main/docs/*.md` link from an old issue, forum post, or release ever 404s. **Never add new content under `docs/`.**

Why: the notes used to be a `[Docs](url)` line plus code fences, with all the prose in `docs/`. Neither surface was complete on its own, the two feature lists drifted, and a first-time reader in Reading mode saw only a purple button. A reviewer read it cold and could learn nothing from it; issue #58 is an unrelated user reporting the same thing.

### Note conventions

- Every note opens with an `# H1`, then one to three sentences of **what the feature does and why you would want it** — behavior, not technical nouns.
- Then the runnable ` ```code-button ` example(s), then `## Options` / `## Caveats` as needed, then `## Platform support` with the Desktop/Mobile table.
- Links between notes are `[Text](<./NN Name.md>)` — or `<../NN Name.md>` / `<../0X Group/NN Name.md>` now the notes sit in folders — **never `[[wikilinks]]`**: wikilinks do not render on GitHub, which is now a primary reading surface. The only `[[…]]` left in the vault are inside the code fences of `01 Where your code lives/09 Wikilinks.md`, where they are the subject.
- Platform tables use reference links (`[require]: <../02 Core functions.md#require>`) so the table columns stay narrow enough to align. There are two per grouped note, and they re-base with everything else. **Never re-align a platform table programmatically by code-point width:** markdownlint's `MD060/table-column-style` counts `✅`/`❌` as **two** columns, so any alignment pass measuring `[...cell].length` adds one stray space per emoji cell and reddens `lint:md`. The rule is not auto-fixable — leave those tables exactly as they are.
- **The notes are grouped into numbered folders, one per `00 Start.md` section.** Each group folder carries a `README.md` folder note — `# <section heading>` + the section's intro + that section's table, which lives there and NOT in `00 Start.md`. `README.md` is not a free choice of name: GitHub renders it under the file list when the folder is browsed as a repository, and the Folder Notes plugin (installed for every demo vault by obsidian-dev-utils' `bootstrapDemoVault`) is configured to look for the same name, so one file serves both surfaces.
- `00 Start.md` is a getting-started guide — what the vault is, a concrete first success, the introductory root notes, then a table linking the eight group READMEs. Every note must still be reachable from it, now via its folder note.
- The `NN` prefixes encode **reading order, not creation order**: they run `01`…`50` in exactly the order the notes appear when the folders are read in order, so the file explorer and the index agree. **Numbers are globally unique and do not restart per folder** — a note keeps one stable id wherever it sits. Insert a note in the middle and every following note is renumbered — cheap to do with a scripted rename plus a link rewrite that resolves each target against the note's OLD folder and re-relativizes it from the new one. Do NOT pattern-match `./` prefixes: the stems also appear in `docs/` stubs, `README.md`, this file, and JSDoc URLs in `src/`, where they are `%20`-encoded.
- `_assets/` holds code fixtures, not documentation; it is excluded from the vault's markdownlint config. `Folder/` is a fixture too — it exists so `04 Relative path.md` has a second folder to demonstrate the `../` hop from.
- **A note-relative `require('./_assets/…')` breaks silently when its note moves.** It resolves against the NOTE, not the vault root, so a moved note's buttons fail at click time. The demo-vault execution project is what catches it — provided the note is still in its walk.

### Gotcha: a heading that is a link target must be kebab-case

Obsidian and GitHub resolve `#fragment` differently, and the vault is read on both. Obsidian's `resolveSubpath` compares `stripHeading(heading).toLowerCase()` against the same of the fragment, where `stripHeading` replaces `` !"#$%&()*+,.:;<=>?@^`{|}~/[]\ `` (and newlines) with a space and collapses runs of whitespace. GitHub instead builds a slug: lowercase, **spaces → hyphens**, punctuation dropped. So a heading is linkable from both surfaces only when its GitHub slug already equals its Obsidian-normalized form:

- `` ## `require()` `` → `#require` works on both — backticks and parens are in Obsidian's strip set and GitHub drops them too. This is why the platform tables have always worked.
- `## Migrate to async` cannot: GitHub wants `#migrate-to-async`, Obsidian wants `#Migrate to async`, and **hyphens are not in the strip set**, so neither fragment satisfies the other.

Hence: any heading that something links to is written kebab-case (`## Migrate-to-async`) and linked with the lowercase slug. Case is free — both sides fold it — but word separators are not. Prose headings nothing links to (`## Platform support`) stay prose. `markdownlint`'s `relative-links` rule enforces the GitHub half of this; the Obsidian half has no linter, so it is on you.

### Gotcha: table alignment with emoji

`MD060` aligns on **display width**, and the `✅` / `❌` in every platform table are two columns wide while a naive `.Length` says one. A script that re-pads tables must use a display-width function, or every table in the vault comes out one column short.

## Testing layout

Five vitest projects:

| Project                        | Script                        | What it covers                                                         |
| ------------------------------ | ----------------------------- | ---------------------------------------------------------------------- |
| `unit-tests`                   | `npm test`                    | Everything mockable, against `obsidian-test-mocks`                     |
| `integration-tests:no-app`     | `test:integration:no-app`     | Demo-vault coverage: every public API member is demonstrated in a note |
| `integration-tests:android`    | `test:integration:android`    | Real Obsidian on an Android emulator over Appium                       |
| `integration-tests:desktop`    | `test:integration:desktop`    | Real Obsidian over CDP                                                 |
| `integration-tests:demo-vault` | `test:integration` (included) | Clicks **every button in every note** and asserts none errors          |

The demo-vault execution project has no dedicated npm script — it runs as the last of the four `test()` calls in `scripts/test-integration.ts`. It is what stops a rewritten note from shipping a broken example.

**The button walk is `obsidian-dev-utils`' shared `registerDemoVaultButtonSuite`, configured in `src/demo-vault.demo-vault.integration.test.ts`.** Until 2026-09-24 that file was a ~560-line specialized copy, kept separate by four gaps the library has since closed: a fence scanner that skips the ` ```code-button ` samples this vault nests inside longer fences and the `isRaw` fences that render no button (`countRenderedButtons` — `42 Code button config.md` is 15 fences of which **2** are real), `excludedFolders` (`08 Working with other plugins/`, whose notes each install a third-party plugin first), `expectedNonOkButtons` (the error demo and the `shouldShowSystemMessages: false` button in `01 Code buttons.md`, which sit below the fold), and `shouldDismissModals` (so a button that `await`s an `alert` resolves). The library also owns the rest of what that copy learned: one transport call per button (the settle and result budgets are spent inside one ~30 s `Runtime.evaluate`, so their SUM is refused at registration), buttons addressed by CAPTION, and a scroll walk that accumulates captions because reading view evicts the sections it scrolls past. **The run clicks 77 buttons across 39 notes** — 40 cases counting the suite's non-empty check. If a change here or a library bump drops that count, that is the defect: check the count, not just the green tick.

What the copy had and the shared suite does not, dropped on purpose: the `DEMO_NOTES` filter (use vitest's `-t 'runs every code button in <note>'` instead), and the JSON execution report written to the OS temp folder, which nothing read — a failing button's captured output is already in the assertion message. The `shows the source toggle` case is this plugin's own feature and lives in `src/code-button-source-toggle.demo-vault.integration.test.ts`.

**Every project that should run must be named explicitly in `scripts/test-integration.ts`.** `test`'s `projects` option expands each name to `--project=<name>` and `--project=<name>:*` only — there is no prefix or wildcard match, so `integration-tests:desktop` does NOT pull in `integration-tests:demo-vault`. Adding a fifth project means adding a fifth `test()` call; forget it and the suite silently never runs. (That is exactly what happened to the demo-vault project: it was absent from the runner and sat inert until 2026-08-09, despite this file claiming it ran.)

Known flake: on 2026-08-09 one demo-vault run failed 3 of 43 with CDP `ECONNREFUSED` against the owned instance's port, then passed 43/43 twice in a row (standalone and in the aggregate). It is the only failure seen in that suite, cause not established. Re-run once before investigating — but if it recurs, chase it rather than retrying forever, because this project is now part of `npm run test:integration` and a flake here reddens the whole aggregate.

Integration tests run the built `dist/build` bundle, not `node_modules`: **`npm run build` before running them**, or the suite silently exercises a stale build.

### Gotcha: a root-level `include` makes every project collect every test file

Measured 2026-09-03 on vitest `5.0.0`, and **fixed in the library since — this section is here so the symptom is recognizable if it ever comes back, not because anything needs doing.** `npm run test:integration:desktop` collected all **63** `src/**/*.test.ts` in the repo, not the **9** its project's `include` names — every one labelled `|integration-tests:desktop|`. `obsidian-dev-utils`' shared config then declared a root-level `include: ['src/**/*.test.ts']` as well as a per-project one; vitest 4 let the project glob replace it, vitest 5 does not, and the root glob is a superset of every project glob.

Three things it did, in order of how much damage they do:

- **It rewrites the five checked-in `images/screenshots/screenshot-desktop-*.png`,** because the capture suites get collected too. That is precisely what naming them `*.desktop-capture.` was meant to prevent (see `scripts/vitest-config.ts`).
- It fails ~21 unit suites on `Failed to resolve entry for package "obsidian"`. That error is correct and not a bug in the test: `obsidian` is types-only (`"main": ""`), so only the `unit-tests` project's alias to `obsidian-test-mocks` makes it importable at runtime.
- It runs the Android and demo-vault suites under the desktop transport, which both slows the run by minutes and reports failures that are pure mis-routing.

**The library owns this and has fixed it.** `defineObsidianPluginVitestConfig` declares no root-level `include` at all — its `test` block carries a comment saying so and saying that restoring one breaks every project — so `scripts/vitest-config.ts` calls the factory directly, with no local wrapper. A repo-local `dropRootInclude` wrapper covered the gap from 2026-09-03 until the library fix landed; it was deleted on 2026-09-20 once it had become a delete of an already-absent key.

**How to check it, if a future vitest or shared-config bump makes you suspect it again:** `npx vitest list --filesOnly --project=<name>` per project. The eight projects must partition the 64 `src/**/*.test.ts` files exactly — 47 `unit-tests`, 1 `no-app`, 9 `desktop`, 0 `desktop-performance`, 2 `android`, 3 `demo-vault`, 1 each capture. Any project reporting 64 is this gotcha.

**Still check `git status` after an integration run.** The screenshots no longer move (measured: a full desktop + demo-vault pass left the tree clean bar the config edit), but that habit is what caught this.

### Gotcha: the authoring checks see `_assets/` as notes

`obsidian-dev-utils` 92 added always-on authoring checks to `registerDemoVaultCoverageSuite` — every note must open with an `# H1`, carry intro prose before its first code fence, and be reachable from `00 Start.md`. They apply to **every** `*.md` under `demo-vault/` (bar a vendored `node_modules`), so the fixtures under `_assets/` — `code-script` modules, Templater templates — failed all three the moment the library was bumped. `src/demo-vault.no-app.integration.test.ts` therefore derives their paths and passes them as `authoring.excludedNotes`, mirroring the `_assets/**` ignore the vault's own `.markdownlint-cli2.jsonc` already carries.

Two traps in that option: it matches **exact relative paths, not globs** (hence the run-time walk, so a new fixture cannot redden the suite), and it **replaces** the checker's default rather than adding to it — drop `README.md` from the list and the vault's own readme starts failing the checks it was exempt from.

### Gotcha: verifying a `08 Working with other plugins/` note by hand

Those notes are excluded from the demo-vault walk (they install a third-party plugin first), so nothing automated ever clicks them — a broken button there ships green. Drive them with a throwaway `*.demo-vault.integration.test.ts` against `getTemporaryVault()`, and delete it after. Three things cost time when doing that:

- **`evalInObsidian`'s callback is serialized into Obsidian**, so module-scope constants are not in scope there — pass them through `input`. And one `Runtime.evaluate` is capped at **30 s**: a callback that installs a plugin *and* renders two notes blows it, so split the work across several `evalInObsidian` calls (state persists — it is the same instance).
- **Reading view renders lazily, and keeps only the sections near the viewport.** A block below the fold never runs until scrolled to, and once scrolled past, its section is evicted from the DOM again — so "scroll to the bottom, then query" finds nothing and reads as a broken block. Creep down in increments and accumulate what you see.
- **A `.block-language-dataviewjs` element that never updates is the Live Preview copy, not a bug.** In preview mode a markdown leaf holds both renderings; only the one under `.markdown-reading-view` is live (`checkVisibility()` tells them apart). Dataview also repaints on its own **2.5 s** `refreshInterval`, so an already-open note lags a frontmatter change unless something triggers `dataview:refresh-views`.

### Gotcha: a hand-started Android emulator has no DNS

`obsidian-integration-testing` starts the emulator itself with `-avd obsidian_test -no-snapshot-load -no-snapshot-save -dns-server 8.8.8.8 [-no-window]`, but if the AVD is **already running** it reuses that device as-is. An emulator started by hand (`emulator -avd obsidian_test`) therefore has no `-dns-server`, and on Windows it inherits a host DNS it cannot reach: IP routing works (`adb shell ping 8.8.8.8` succeeds) while **every hostname fails** (`adb shell ping cdn.jsdelivr.net` → `unknown host`).

The only android test that touches the network is the HTTP-URL `requireAsync` case (`cdn.jsdelivr.net/npm/is-number`), so the symptom is a single confusing failure — `Request Failed. UnknownHostException Unable to resolve host` — in an otherwise green suite. Fix: `adb emu kill`, then let the harness boot the emulator itself. Do not "fix" the test.

### Gotcha: the Android project can fail before a single test runs, and that is not this repo

Observed 2026-09-03, twice in a row on a clean machine (no leftover `qemu`/`emulator`/`appium` processes, `adb devices` showing only a physical phone). The harness auto-started Appium, booted `obsidian_test`, reported "boot completed" and "device is idle" — and then `POST /session` failed: once with the device dropping out of adb's list mid-handshake (`device offline` → `Device emulator-5554 was not in the list of connected devices`), once with `adb shell getprop ro.build.version.sdk` timing out at 20 s twice before the session creation aborted.

That is a wedged emulator during Appium session creation — the transport's problem, not the suite's (filed against `obsidian-integration-testing`, along with the teardown half that can leave a zombie emulator behind). The tell is that **no test ever ran**: `Tests 1 failed | 24 skipped`, every failure an `IntegrationSetupFailedError` with the same `Original error`. Do not read it as an Android regression in this plugin, and do not go editing the android suites. Re-run once; if it wedges again, check whether something else on the machine is driving adb (a second AVD, a concurrent Android session), then leave it for the harness.

`scripts/demo-vault-global-setup.ts` mirrors the CodeScript Toolkit settings that `obsidian-dev-utils`' `demo-vault-helper` writes, including the `defaultCodeButtonConfig` that turns the code-button source panel on. Two copies of one contract — keep them in sync.

## Releasing

### The generated changelog section ships commit subjects verbatim

`npm run version` builds the new `CHANGELOG.md` section from the first-parent commit subjects since the last tag — one bullet per commit, each one the subject line as written — and then opens that section in an editor before anything is committed. (The review is on by default; `--no-changelog-editing` accepts the generated text as is, and `--changelog-file <path>` supplies prepared notes instead.) `obsidian-dev-utils` runs this repo's own `lint:md` and `spellcheck` over the section and aborts the release on a finding, so a misspelling is caught for you — **wording is not**. A subject written for whoever wrote it reads as a release note to everyone else: an in-house shorthand, an abbreviation for another repository, a reference to a tracker this project does not have. Rewrite such an entry in that editor, where it is still an ordinary file. The commit it came from is pushed history and stays exactly as it is.

**Pending — delete this paragraph once it has shipped.** Three subjects in the range since `13.7.1` need that treatment. `ac50667` names a group of repositories by a collective noun that a reader of this one has no list to resolve: rewrite its entry as `docs: align the debug section's wording with the sibling plugins`. `d32e954` is a merge whose subject, `Merge: float obsidian-test-mocks to ^7.0.0`, carries no Conventional-Commits type: rewrite it as `chore(deps): float obsidian-test-mocks to ^7.0.0`. `b895038` is the same shape, `Merge: move the demo-vault button walk onto the shared suite`: rewrite it as `chore(deps): float obsidian-dev-utils to ^107.0.0 and obsidian-integration-testing to ^17.0.1`, since the dependency float is the part a reader of the release cares about. Every other subject in the range was read when this was written, on 2026-09-20, and needed nothing — but the range keeps growing, so that is a statement about a date rather than about the section you are reviewing.

## Testing notes

### The mobile screenshot capture suite

The mobile frames are captured by **two different routes**, and which route a frame takes is a decision about that frame rather than a style choice:

- **A frame whose subject is not a focused field captures the PAGE** (`captureObsidianScreenshot`), which is byte-reproducible: no status bar and no clock, so re-capturing an unchanged frame leaves no diff. A real phone shows no keyboard on such a screen either, so raising one would make the frame *less* true.
- **A frame whose subject IS a focused field captures the DEVICE** (`captureDeviceScreenshot`), with the soft keyboard raised first. A page capture cannot show a keyboard: it drives Appium in the WebView context, so it photographs the page, and the IME is a system window that is not part of the page. That left the command-palette frame as a search field over a large empty band, with the caption band — drawn across the bottom of the image — landing on the field and clipping the typed text. **The cost is that the switched frame is no longer byte-reproducible**, since the status-bar clock and the battery indicator are in it. Do not "fix" that churn by putting it back on the page capture, and do not switch the other frames over for consistency.
- **Raising the keyboard takes TWO things**, which is why both belong to `obsidian-integration-testing` rather than being copied in here. The AVD is built with a hardware keyboard attached, so Android suppresses the on-screen one entirely — `withSoftKeyboardEnabled` lifts that for the duration of a shot and restores the device exactly, including restoring a setting that had never been written, which takes a delete rather than a write. And a WebView will not ask for an IME on programmatic focus alone: `raiseSoftKeyboard` lands a real touch on the field and then proves geometrically that it lifted, because nothing in the page reports the keyboard — `innerHeight`, `visualViewport` and the modal container all keep their full height with it shown. A failure writes the device framebuffer and the device's own input-method state to `dist/screenshots/`, because a bare assertion failure here is unreadable.
- **A passing lift check is not the same as a good frame.** The check asks whether the FIELD moved clear of the bottom; it cannot tell you the keyboard covered the thing the shot is evidence for. So look at a switched frame, every time, rather than trusting the measurement alone.
- **The field it touches is read off the suite, not assumed.** The command palette renders `.prompt input`, which is not the `.prompt-input` a suggester renders.
