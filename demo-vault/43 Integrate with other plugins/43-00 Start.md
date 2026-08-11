# Integrate with other plugins

Several Obsidian plugins already let you run JavaScript. CodeScript Toolkit is not a replacement for them — it upgrades what their scripts can do, because its `require()` works inside them too. So a `dataviewjs` block can load a TypeScript module from your vault, and a code button can call Dataview's API back.

**None of this is required.** CodeScript Toolkit is self-sufficient and needs no other plugin. These notes are for when you already use one of the below and want the two to cooperate.

Each note shows both directions: running CodeScript Toolkit from that plugin, and running that plugin from a code button. None of these plugins ships with this demo vault, so each note starts with a button that installs and enables it for you.

- [43-01 `CustomJS` scripts](<./43-01 CustomJS.md>) — class-based scripts, callable from anywhere
- [43-02 `datacorejs` / `datacorejsx` / `datacorets` / `datacoretsx` scripts](<./43-02 Datacore.md>) — Datacore's four code-view flavours, including JSX
- [43-03 `dataviewjs` scripts](<./43-03 Dataview.md>) — the most widely used scripting surface in Obsidian
- [43-04 `DevTools Console` within `Obsidian`](<./43-04 DevTools Console.md>) — the console is a scripting surface too
- [43-05 `JS Engine` scripts](<./43-05 JS Engine.md>) — render JS output into a note
- [43-06 `Modules` scripts](<./43-06 Modules.md>) — another module loader, working alongside this one
- [43-07 `QuickAdd` scripts](<./43-07 QuickAdd.md>) — scripted capture and template choices
- [43-08 `Templater` scripts](<./43-08 Templater.md>) — scripts inside templates
