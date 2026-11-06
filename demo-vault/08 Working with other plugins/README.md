# Working with other plugins

Several Obsidian plugins already let you run JavaScript. `CodeScript Toolkit` is not a replacement for them — it upgrades what their scripts can do, because its `require()` works inside them too. So a `dataviewjs` block can load a TypeScript module from your vault, and a code button can call `Dataview`'s API back.

**None of this is required.** `CodeScript Toolkit` is self-sufficient and needs no other plugin. These notes are for when you already use one of the below and want the two to cooperate.

Most of these notes show both directions: running `CodeScript Toolkit` from that plugin, and running that plugin from a code button. [48 Parameterized Dataview queries](<./48 Parameterized Dataview queries.md>) is different — it is a recipe built on top of one of them. None of these plugins ships with this demo vault, so every note here starts with a button that installs and enables what it needs.

| Note                                                                          | What it covers                                                   |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [45 CustomJS](<./45 CustomJS.md>)                                             | Class-based scripts, callable from anywhere                      |
| [46 Datacore](<./46 Datacore.md>)                                             | `Datacore`'s four code-view flavours, including JSX              |
| [47 Dataview](<./47 Dataview.md>)                                             | `dataviewjs`, the most widely used scripting surface in Obsidian |
| [48 Parameterized Dataview queries](<./48 Parameterized Dataview queries.md>) | Frontmatter-driven queries, and `dv.view()` over a real module   |
| [49 JS Engine](<./49 JS Engine.md>)                                           | Render JS output into a note                                     |
| [50 Modules](<./50 Modules.md>)                                               | Another module loader, working alongside this one                |
| [51 QuickAdd](<./51 QuickAdd.md>)                                             | Scripted capture and template choices                            |
| [52 Templater](<./52 Templater.md>)                                           | Scripts inside templates                                         |

The [DevTools Console](<../03 DevTools Console.md>) is a scripting surface too, but it is part of Obsidian rather than a plugin, so it is covered at the root of this vault instead.
