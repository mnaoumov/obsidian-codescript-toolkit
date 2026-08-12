# AGENTS.md

## The demo vault IS the documentation

There is no separate prose documentation. `demo-vault/` is the plugin's documentation, read either
in Obsidian (where the buttons run) or on GitHub (where it is plain markdown). `docs/` still exists,
but every page there is a one-line redirect stub — kept permanently so no `blob/main/docs/*.md` link
from an old issue, forum post, or release ever 404s. **Never add new content under `docs/`.**

Why: the notes used to be a `[Docs](url)` line plus code fences, with all the prose in `docs/`.
Neither surface was complete on its own, the two feature lists drifted, and a first-time reader in
Reading mode saw only a purple button. ClareMacrae reviewed it cold and could learn nothing from it;
issue #58 is an unrelated user reporting the same thing.

### Note conventions

- Every note opens with an `# H1`, then one to three sentences of **what the feature does and why
  you would want it** — behavior, not technical nouns.
- Then the runnable ` ```code-button ` example(s), then `## Options` / `## Caveats` as needed, then
  `## Platform support` with the Desktop/Mobile table.
- Links between notes are `[Text](<./NN Name.md>)` — or `<../NN Name.md>` / `<../0X Group/NN Name.md>`
  now the notes sit in folders — **never `[[wikilinks]]`**: wikilinks do not render on GitHub, which is
  now a primary reading surface. The only `[[…]]` left in the vault are inside the code fences of
  `01 Where your code lives/09 Wikilinks.md`, where they are the subject.
- Platform tables use reference links (`[require]: <../02 Core functions.md#require>`) so the table
  columns stay narrow enough to align. There are two per grouped note, and they re-base with
  everything else. **Never re-align a platform table programmatically by code-point width:**
  markdownlint's `MD060/table-column-style` counts `✅`/`❌` as **two** columns, so a padder that
  measures `[...cell].length` adds one stray space per emoji cell and reddens `lint:md`. The rule is
  not auto-fixable — leave those tables exactly as they are.
- **The notes are grouped into numbered folders, one per `00 Start.md` section (G95).** Each group
  folder carries a `README.md` folder note — `# <section heading>` + the section's intro + that
  section's table, which lives there and NOT in `00 Start.md`. `README.md` is not a free choice of
  name: GitHub renders it under the file list when the folder is browsed as a repository, and the
  Folder Notes plugin (installed for every demo vault by ODU's `bootstrapDemoVault`) is configured to
  look for the same name, so one file serves both surfaces.
- `00 Start.md` is a getting-started guide — what the vault is, a concrete first success, the
  introductory root notes, then a table linking the eight group READMEs. Every note must still be
  reachable from it, now via its folder note.
- The `NN` prefixes encode **reading order, not creation order**: they run `01`…`50` in exactly the
  order the notes appear when the folders are read in order, so the file explorer and the index agree.
  **Numbers are globally unique and do not restart per folder** — a note keeps one stable id wherever
  it sits. Insert a note in the middle and every following note is renumbered — cheap to do with a
  scripted rename plus a link rewrite that resolves each target against the note's OLD folder and
  re-relativizes it from the new one. Do NOT pattern-match `./` prefixes: the stems also appear in
  `docs/` stubs, `README.md`, this file, and JSDoc URLs in `src/`, where they are `%20`-encoded.
- `_assets/` holds code fixtures, not documentation; it is excluded from the vault's markdownlint
  config. `Folder/` is a fixture too — it exists so `04 Relative path.md` has a second folder to
  demonstrate the `../` hop from.
- **A note-relative `require('./_assets/…')` breaks silently when its note moves.** It resolves against
  the NOTE, not the vault root, so a moved note's buttons fail at click time. The demo-vault execution
  project is what catches it — provided the note is still in its walk.

### Gotcha: a heading that is a link target must be kebab-case

Obsidian and GitHub resolve `#fragment` differently, and the vault is read on both. Obsidian's
`resolveSubpath` compares `stripHeading(heading).toLowerCase()` against the same of the fragment,
where `stripHeading` replaces `` !"#$%&()*+,.:;<=>?@^`{|}~/[]\ `` (and newlines) with a space and
collapses runs of whitespace. GitHub instead builds a slug: lowercase, **spaces → hyphens**,
punctuation dropped. So a heading is linkable from both surfaces only when its GitHub slug already
equals its Obsidian-normalized form:

- `` ## `require()` `` → `#require` works on both — backticks and parens are in Obsidian's strip set
  and GitHub drops them too. This is why the platform tables have always worked.
- `## Migrate to async` cannot: GitHub wants `#migrate-to-async`, Obsidian wants `#Migrate to async`,
  and **hyphens are not in the strip set**, so neither fragment satisfies the other.

Hence: any heading that something links to is written kebab-case (`## Migrate-to-async`) and linked
with the lowercase slug. Case is free — both sides fold it — but word separators are not. Prose
headings nothing links to (`## Platform support`) stay prose. `markdownlint`'s `relative-links` rule
enforces the GitHub half of this; the Obsidian half has no linter, so it is on you.

### Gotcha: table alignment with emoji

`MD060` aligns on **display width**, and the `✅` / `❌` in every platform table are two columns wide
while a naive `.Length` says one. A script that re-pads tables must use a display-width function, or
every table in the vault comes out one column short.

## Testing layout

Five vitest projects:

| Project                        | Script                        | What it covers                                                         |
| ------------------------------ | ----------------------------- | ---------------------------------------------------------------------- |
| `unit-tests`                   | `npm test`                    | Everything mockable, against `obsidian-test-mocks`                     |
| `integration-tests:no-app`     | `test:integration:no-app`     | Demo-vault coverage: every public API member is demonstrated in a note |
| `integration-tests:android`    | `test:integration:android`    | Real Obsidian on an Android emulator over Appium                       |
| `integration-tests:desktop`    | `test:integration:desktop`    | Real Obsidian over CDP                                                 |
| `integration-tests:demo-vault` | `test:integration` (included) | Clicks **every button in every note** and asserts none errors          |

The demo-vault execution project has no dedicated npm script — it runs as the last of the four
`test()` calls in `scripts/test-integration.ts`. It is what stops a rewritten note from shipping a
broken example.

**Its walk must recurse, and must exclude by basename.** The notes live in numbered group folders, so
a top-level-only `readdirSync(...).filter((entry) => entry.isFile())` would find the three notes left
at the vault root, click those, and pass — the coverage loss is invisible, because an empty note list
makes every assertion vacuous. `collectNotes` therefore recurses, skips `_`- and `.`-prefixed folders
plus `08 Working with other plugins/` (whose notes each install a third-party plugin first), and
excludes `00 Start.md` / `README.md` at **every** depth rather than only at the top. If a change to
this suite drops the note count, that is the defect — check the count, not just the green tick.

**Every project that should run must be named explicitly in `scripts/test-integration.ts`.** `test`'s
`projects` option expands each name to `--project=<name>` and `--project=<name>:*` only — there is no
prefix or wildcard match, so `integration-tests:desktop` does NOT pull in
`integration-tests:demo-vault`. Adding a fifth project means adding a fifth `test()` call; forget it
and the suite silently never runs. (That is exactly what happened to the demo-vault project: it was
absent from the runner and sat inert until 2026-08-09, despite this file claiming it ran.)

Known flake: on 2026-08-09 one demo-vault run failed 3 of 43 with CDP `ECONNREFUSED` against the
owned instance's port, then passed 43/43 twice in a row (standalone and in the aggregate). It is the
only failure seen in that suite, cause not established. Re-run once before investigating — but if it
recurs, chase it rather than retrying forever, because this project is now part of
`npm run test:integration` and a flake here reddens the whole aggregate.

Integration tests run the built `dist/build` bundle, not `node_modules`: **`npm run build` before
running them**, or the suite silently exercises a stale build.

### Gotcha: the authoring checks see `_assets/` as notes

`obsidian-dev-utils` 92 added always-on authoring checks to `registerDemoVaultCoverageSuite` — every
note must open with an `# H1`, carry intro prose before its first code fence, and be reachable from
`00 Start.md`. They apply to **every** `*.md` under `demo-vault/` (bar a vendored `node_modules`), so
the fixtures under `_assets/` — `code-script` modules, Templater templates — failed all three the
moment the library was bumped. `src/demo-vault.no-app.integration.test.ts` therefore derives their
paths and passes them as `authoring.excludedNotes`, mirroring the `_assets/**` ignore the vault's own
`.markdownlint-cli2.jsonc` already carries.

Two traps in that option: it matches **exact relative paths, not globs** (hence the run-time walk, so
a new fixture cannot redden the suite), and it **replaces** the checker's default rather than adding
to it — drop `README.md` from the list and the vault's own readme starts failing the checks it was
exempt from.

### Gotcha: a hand-started Android emulator has no DNS

`obsidian-integration-testing` starts the emulator itself with
`-avd obsidian_test -no-snapshot-save -dns-server 8.8.8.8 [-no-window]`, but if the AVD is **already
running** it reuses that device as-is. An emulator started by hand (`emulator -avd obsidian_test`)
therefore has no `-dns-server`, and on Windows it inherits a host DNS it cannot reach: IP routing
works (`adb shell ping 8.8.8.8` succeeds) while **every hostname fails**
(`adb shell ping cdn.jsdelivr.net` → `unknown host`).

The only android test that touches the network is the HTTP-URL `requireAsync` case
(`cdn.jsdelivr.net/npm/is-number`), so the symptom is a single confusing failure —
`Request Failed. UnknownHostException Unable to resolve host` — in an otherwise green suite. Fix:
`adb emu kill`, then let the harness boot the emulator itself. Do not "fix" the test.

`scripts/demo-vault-global-setup.ts` mirrors the CodeScript Toolkit settings that
`obsidian-dev-utils`' `demo-vault-helper` writes, including the `defaultCodeButtonConfig` that turns
the code-button source panel on. Two copies of one contract — keep them in sync.
