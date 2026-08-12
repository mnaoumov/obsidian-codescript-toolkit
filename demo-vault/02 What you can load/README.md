# What you can load

Obsidian's own `require()` loads CommonJS and little else. This plugin widens that to the file types a real project actually contains — ES modules, TypeScript, JSON, WebAssembly, native addons — with no build step and no watcher. These notes take them one at a time.

| Note                                                      | What it covers                                              |
| --------------------------------------------------------- | ----------------------------------------------------------- |
| [11 ECMAScript modules](<./11 ECMAScript modules.md>)     | `import`/`export`, which Obsidian's own `require()` refuses |
| [12 TypeScript modules](<./12 TypeScript modules.md>)     | `.ts` files with no build step and no watcher               |
| [13 JSON files](<./13 JSON files.md>)                     | Config and data files, parsed for you                       |
| [14 Markdown files](<./14 Markdown files.md>)             | Keep the code in a note, beside the prose explaining it     |
| [15 Node binaries](<./15 Node binaries.md>)               | Compiled native addons — `.node`                            |
| [16 WebAssembly](<./16 WebAssembly.md>)                   | `.wasm`, and unlike native addons it works on mobile        |
| [17 ASAR archives](<./17 ASAR.md>)                        | Read inside an Electron archive as if it were a folder      |
| [18 Override module type](<./18 Override module type.md>) | Load a file whose extension lies about what it is           |
