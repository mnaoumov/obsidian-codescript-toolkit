# Scratch script

A throwaway slot for one-off jobs: rename a batch of notes, strip an empty property across the vault, count something once. Rewrite the script for whatever comes up, run it from the command palette or a hotkey, and rewrite it again tomorrow. Nothing to name, no command to register, no button to click inside a note.

The scratch script is one note holding one `code-script` block that exports [`invoke()`](<./37 Invocable scripts.md>):

- `CodeScript Toolkit: Run scratch script` runs it **without opening the note**;
- `CodeScript Toolkit: Edit scratch script` opens the note, so you can rewrite the block — on mobile too, because it is a note rather than a `.ts` file.

This vault ships one, [`Scratch script.md`](<../_assets/CodeScriptToolkit/Scratch script.md>), which counts the notes in the vault. Click the button, or invoke the command, to run it:

```code-button
---
caption: Run scratch script
---
app.commands.executeCommandById('fix-require-modules:run-scratch-script');
```

A notice says `Scratch script finished` when `invoke()` returns, or shows the error when it throws; the full error goes to the console.

## Options

The **Scratch script path** setting names the note. It is relative to the **Script modules root**, like the other paths, and defaults to `Scratch script.md`.

When the note does not exist yet, either command creates it from a template — a heading, one line of prose, and an empty `invoke()` — and opens it. **Run** does not run the empty template; it tells you to write your code first.

Bind both commands to [hotkeys](<./41 Hotkeys.md>) and the round trip is two keystrokes.

## Caveats

There is one slot. The previous version of the script is gone once you rewrite it, unless your vault keeps history (`git`, Obsidian Sync's version history, or the `File recovery` core plugin).

The note may hold other `code-script` blocks too: the one that runs is chosen the same way as for any [Markdown file you `require()`](<../02 What you can load/14 Markdown files.md>).

## Platform support

| Desktop | Mobile |
| ------- | ------ |
| ✅      | ✅     |
