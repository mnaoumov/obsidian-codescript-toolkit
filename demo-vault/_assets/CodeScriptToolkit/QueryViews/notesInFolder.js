// A Dataview custom view. `dv.view()` evaluates this file with `new Function('dv', 'input', contents)`, so
// it is not a module: no `import`, no `export`, no TypeScript. `requireAsync()` is a global this plugin
// adds, which is enough to make the view a shim over the same module the frontmatter dispatcher calls.
const { runQuery } = await requireAsync('/QueryModules/notesInFolder.ts');
await runQuery(dv, input);
