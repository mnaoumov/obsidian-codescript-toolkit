# Where your code lives

`require()` takes more than one kind of path, and which one you reach for decides how your scripts survive being moved, renamed, or shared. These notes cover every form the plugin accepts — from a plain `./helper.js` beside the note to an Obsidian link that keeps working after a rename.

| Note                                                              | What it covers                                                                     |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [04 Relative path](<./04 Relative path.md>)                       | `./helper.js` — split code across files the way you would in any project           |
| [05 Root-relative path](<./05 Root-relative path.md>)             | `/script.js` — address scripts from your scripts folder, not from the current note |
| [06 System root path](<./06 System root path.md>)                 | `~/code/lib.js` — reach outside the vault on Linux and macOS                       |
| [07 Vault-root-relative path](<./07 Vault-root-relative path.md>) | `//notes/data.js` — address anything from the vault root                           |
| [08 TFile](<./08 TFile.md>)                                       | Pass an Obsidian file object straight to `require()`                               |
| [09 Wikilinks](<./09 Wikilinks.md>)                               | Require through a wikilink, so renames keep it working                             |
| [10 Markdown links](<./10 Markdown links.md>)                     | The same, for vaults that use markdown-style links                                 |
