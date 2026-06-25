# Current Task

None.

## What's done

- 35 integration tests across 7 files, all passing
- Bug fix: ScriptFolderWatcher missed initial loadSettings event (component load ordering)
- Bug fix: broken relative links in docs/code-button-config.md and docs/code-button-context.md
- Workaround: afterAll detaches markdown leaves to avoid CLI eval interference
- Added dedent dependency for multiline strings
- Added strictProxy rule to global TypeScript rules

## Integration test coverage (135 tests)

| Feature                                                                                        | Tests |
|------------------------------------------------------------------------------------------------|-------|
| Module formats (CJS, ESM, CTS, MTS, JSON, MD)                                                  | 6     |
| Path resolution (relative, transitive)                                                         | 2     |
| Built-in modules (obsidian, @codemirror)                                                       | 2     |
| Async (top-level await, dynamic import, requireAsyncWrapper)                                   | 3     |
| NPM modules from vault node_modules                                                            | 1     |
| Smart caching (cacheInvalidationMode: always)                                                  | 1     |
| Special modules (obsidian/app, obsidian-dev-utils, specialModuleNames, node:path)              | 4     |
| Desktop modules (electron, @electron/remote)                                                   | 2     |
| Module type override (load .txt as JS, load .dat as JSON)                                      | 2     |
| Source maps (TS module transformation)                                                         | 1     |
| Clear cache command (never mode + clear-cache)                                                 | 1     |
| WASM modules (requireAsync desktop, sync throw, mobile, Android)                               | 4     |
| ASAR archives (sync + async from .asar file)                                                   | 2     |
| Node binaries (async + sync error, mobile throw, Android throw)                                | 4     |
| Invocable scripts (register, execute, TS, invokeCommand, checkCallback, editor, editorCheck)   | 8     |
| Code buttons (render, autoRun, isRaw, import transform)                                        | 4     |
| Code-button context (renderMarkdown, insertBefore/After, remove, replace)                      | 5     |
| Code-button config (shouldAutoOutput, shouldWrapConsole, removeAfterExecution)                 | 3     |
| Startup script (invoke, cleanup+reload)                                                        | 2     |
| Protocol handler (module via code, inline code)                                                | 2     |
| Temp plugin registry (API access, register+unregister, getTempPlugin)                          | 3     |
| File URLs (file:/// async + sync)                                                              | 2     |
| Resource URLs (resource prefix async + sync)                                                   | 2     |
| HTTP URLs (requireAsync from CDN)                                                              | 1     |
| TFile instances (requireAsync + sync require + options forwarding desktop, mobile, Android)    | 8     |
| Wikilinks and markdown links (async + sync, alias, desktop, mobile, Android)                   | 9     |
| Synchronous require (all desktop-supported modules)                                            | 16    |
| Emulate-mobile (all mobile features, file/resource/HTTP URLs, WASM, sync/electron/node throw)  | 21    |
| Android (all mobile features, file/resource/HTTP URLs, WASM, sync/electron/node throw)         | 20    |
| Smoke test                                                                                     | 2     |

## Coverage status

All features are now fully covered across code, docs, demo vault, and integration tests (135 tests).

- ~~Integration test gaps (WASM, ASAR, node binaries)~~ — **Done**
- ~~Demo vault gap (`requireAsyncWrapper()`)~~ — **Done**
- ~~Docs gap (plugin integrations)~~ — **Done** (added demo vault link to `docs/usage.md`; dedicated guide pages intentionally out of scope)

## Known Issues

None.
