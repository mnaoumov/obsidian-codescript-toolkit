# Parameterized Dataview queries

A `dataviewjs` block is fixed the moment you write it: the question lives in the note, so every new question needs another block. Move the question into the note's **frontmatter** instead, and one block can answer all of them — it reads the frontmatter, loads the TypeScript module named there, and hands it the query value. Every query in your vault then becomes an ordinary module you can reuse and refactor, and asking one is a two-line script.

## Prerequisite

`Dataview` is not bundled with this demo vault. Install and enable it first:

```code-button
---
caption: Install and enable Dataview
---
await require('/demoSetup.ts').installConfigureEnable(app, 'dataview', { enableDataviewJs: true });
```

## Two questions, one view

Each button points the same host note at a different module with a different parameter, then opens it. The answer changes; the view does not.

```code-button
---
caption: Ask for the five most recently modified notes
---
const { runQuery } = await requireAsync('/queryDispatcher.ts');
await runQuery(app, '/QueryModules/recentlyModified.ts', { limit: 5 });
```

```code-button
---
caption: Ask what is in a folder
---
const { runQuery } = await requireAsync('/queryDispatcher.ts');
await runQuery(app, '/QueryModules/notesInFolder.ts', { folder: '01 Where your code lives' });
```

## How it works

Three parts, none of them large.

**The host note** — `_assets/CodeScriptToolkit/Query.md` — holds the current question in its frontmatter, and renders it with a block that never changes:

````markdown
---
query:
  limit: 5
queryModulePath: /QueryModules/recentlyModified.ts
---

```dataviewjs
const { executeQuery } = await requireAsync('/queryDispatcher.ts');
await executeQuery(dv);
```
````

**The dispatcher** — `/queryDispatcher.ts` — is the only code that knows about that convention. `executeQuery()` reads the two keys, loads the module and delegates to it; `runQuery()` writes them and opens the note:

```ts
export async function executeQuery(dv) {
  const frontmatter = await getFrontmatterSafe(dv.app, QUERY_NOTE_PATH);
  const queryModule = await requireAsync(frontmatter.queryModulePath);
  await queryModule.runQuery(dv, frontmatter.query);
}

export async function runQuery(app, queryModulePath, query) {
  const queryNote = app.vault.getFileByPath(QUERY_NOTE_PATH);

  await app.fileManager.processFrontMatter(queryNote, (frontmatter) => {
    frontmatter.queryModulePath = queryModulePath;
    frontmatter.query = query;
  });

  await app.workspace.getLeaf('tab').openFile(queryNote, { state: { mode: 'preview' } });
}
```

The shipped file adds the validation, the tab reuse and the refresh nudge this excerpt leaves out — open `_assets/CodeScriptToolkit/queryDispatcher.ts` to read it. `getFrontmatterSafe()` comes from [`obsidian-dev-utils`](<../03 Modules you did not write/22 obsidian-dev-utils.md>) and waits for the metadata cache to catch up, so the query just written is the one read back.

**The query module** — anything exporting `runQuery`. This is the whole of `/QueryModules/notesInFolder.ts`:

```ts
export function runQuery(dv, query) {
  const pages = dv.pages(`"${query.folder}"`).sort((page) => page.file.name);

  dv.table(['Note', 'Size'], pages.map((page) => [page.file.link, `${page.file.size} bytes`]));
}
```

## Options

A query module is a normal module, in any format the plugin loads, exporting one function:

- `export function runQuery(dv: DataviewInlineApi, query: unknown): void`
- `export async function runQuery(dv: DataviewInlineApi, query: unknown): Promise<void>`

`query` is whatever you pass it — a number, a string, an object, a list — as long as it survives a YAML round-trip into frontmatter and back out.

`dv` is the host note's [Dataview](<./46 Dataview.md>) inline API, so a module renders tables, lists, callouts and raw HTML exactly as an inline block would. Being a module rather than a fenced block, it can also `require()` your other modules, keep its own helpers, and move between vaults as a file.

## Dataview's own `dv.view()`

Dataview has a related mechanism of its own. [`dv.view(path, input)`](https://blacksmithgu.github.io/obsidian-dataview/api/code-reference/) loads a `.js` file from your vault and runs it with `dv` and your `input` in scope, so the rendering can at least live outside the note.

It stops short of a module, though: the file is evaluated as `new Function('dv', 'input', contents)`, which leaves it with no `import`, no `export`, no TypeScript and nothing from npm — and it is found by Obsidian's link resolution rather than as a module path. That is the gap this plugin closes. The view file becomes a two-line shim, and what it calls is the very module the buttons above use:

```dataviewjs
await dv.view('_assets/CodeScriptToolkit/QueryViews/notesInFolder', { folder: '02 What you can load' });
```

The whole of `_assets/CodeScriptToolkit/QueryViews/notesInFolder.js`:

```js
const { runQuery } = await requireAsync('/QueryModules/notesInFolder.ts');
await runQuery(dv, input);
```

Which of the two you want depends on where the question comes from. `dv.view()` reads its `input` from the block, so the question is still written at authoring time — right for a view you place deliberately in a note. The dispatcher reads it from frontmatter, so a button, a command or another script can ask a new one without editing any block.

## Turning a query into a command

Wrap a call in an [invocable script](<../06 Running scripts without a button/37 Invocable scripts.md>) and the query gets a name in the `Command Palette`, and a [hotkey](<../06 Running scripts without a button/40 Hotkeys.md>) if you want one:

```ts
export async function invoke(app) {
  const { runQuery } = await requireAsync('/queryDispatcher.ts');
  await runQuery(app, '/QueryModules/recentlyModified.ts', { limit: 20 });
}
```

That is the shape every query settles into: one module that answers the question, one line that asks it.

## Caveats

- **One question at a time.** The host note is shared state, so a second query replaces the first. Point a second host note at the dispatcher if you want two answers side by side.
- **`require()` inside `dataviewjs` does not reach the plugin on mobile** — see the warning in [Dataview](<./46 Dataview.md>). The block in the host note uses `requireAsync()`, which does.
- **Frontmatter is YAML, not JavaScript.** A query comes back as plain data: no functions, no class instances, and a date-like string may come back as a date.
- **Dataview repaints on a timer.** Its refresh interval is 2.5 seconds by default, so a host note that is already open would otherwise keep showing the previous answer for a moment after the frontmatter changes. `runQuery()` asks Dataview to refresh straight away to close that gap.

## Platform support

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ✅      | ❌     |
| **[`requireAsync()`][requireAsync]** | ✅      | ✅     |

[require]: <../02 Core functions.md#require>
[requireAsync]: <../02 Core functions.md#requireasync>
