# Integrate with other plugins

Several Obsidian plugins already let you run JavaScript. CodeScript Toolkit is not a replacement for them — it upgrades what their scripts can do, because its `require()` works inside them too. So a `dataviewjs` block can load a TypeScript module from your vault, and a code button can call Dataview's API back.

**None of this is required.** CodeScript Toolkit is self-sufficient and needs no other plugin. These notes are for when you already use one of the below and want the two to cooperate.

Each note shows both directions: running CodeScript Toolkit from that plugin, and running that plugin from a code button. None of these plugins ships with this demo vault, so each note starts with a button that installs and enables it for you.

- [01-01 `CustomJS` scripts](<./01-01 CustomJS.md>) — class-based scripts, callable from anywhere
- [01-02 `datacorejs` / `datacorejsx` / `datacorets` / `datacoretsx` scripts](<./01-02 Datacore.md>) — Datacore's four code-view flavours, including JSX
- [01-03 `dataviewjs` scripts](<./01-03 Dataview.md>) — the most widely used scripting surface in Obsidian
- [01-04 `DevTools Console` within `Obsidian`](<./01-04 DevTools Console.md>) — the console is a scripting surface too
- [01-05 `JS Engine` scripts](<./01-05 JS Engine.md>) — render JS output into a note
- [01-06 `Modules` scripts](<./01-06 Modules.md>) — another module loader, working alongside this one
- [01-07 `QuickAdd` scripts](<./01-07 QuickAdd.md>) — scripted capture and template choices
- [01-08 `Templater` scripts](<./01-08 Templater.md>) — scripts inside templates
