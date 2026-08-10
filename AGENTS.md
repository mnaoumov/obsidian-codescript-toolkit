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
- Links between notes are `[Text](<./NN Name.md>)`, **never `[[wikilinks]]`** — wikilinks do not
  render on GitHub, which is now a primary reading surface. The only `[[…]]` left in the vault are
  inside the code fences of `13 Wikilinks.md`, where they are the subject.
- Platform tables use reference links (`[require]: <./40 Core functions.md#require>`) so the table
  columns stay narrow enough to align.
- `00 Start.md` is a getting-started guide — what the vault is, a concrete first success, then an
  index grouped by intent with a one-line description per entry. Every note must be reachable from
  it.
- `_assets/` holds code fixtures, not documentation; it is excluded from the vault's markdownlint
  config.

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
| `integration-tests:demo-vault` | `test:integration` (included) | Clicks **every button in every root note** and asserts none errors     |

The demo-vault execution project has no dedicated npm script — it runs as part of
`npm run test:integration`. It is what stops a rewritten note from shipping a broken example.

Integration tests run the built `dist/build` bundle, not `node_modules`: **`npm run build` before
running them**, or the suite silently exercises a stale build.

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
