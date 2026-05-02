# Current Task

Comprehensive coverage analysis: ensure docs (`docs/`), integration tests (`src/*.desktop.integration.test.ts`), and demo vault (`obsidian-codescript-toolkit-demo-vault`) all cover every implemented feature.

## What's done

- 35 integration tests across 7 files, all passing
- Bug fix: ScriptFolderWatcher missed initial loadSettings event (component load ordering)
- Bug fix: broken relative links in docs/code-button-config.md and docs/code-button-context.md
- Workaround: afterAll detaches markdown leaves to avoid CLI eval interference
- Added dedent dependency for multiline strings
- Added strictProxy rule to global TypeScript rules

## Integration test coverage (110 tests)

| Feature                                                                                      | Tests |
|----------------------------------------------------------------------------------------------|-------|
| Module formats (CJS, ESM, CTS, MTS, JSON, MD)                                                | 6     |
| Path resolution (relative, transitive)                                                       | 2     |
| Built-in modules (obsidian, @codemirror)                                                     | 2     |
| Async (top-level await, dynamic import, requireAsyncWrapper)                                 | 3     |
| NPM modules from vault node_modules                                                          | 1     |
| Smart caching (cacheInvalidationMode: always)                                                | 1     |
| Special modules (obsidian/app, obsidian-dev-utils, specialModuleNames, node:path)            | 4     |
| Desktop modules (electron, @electron/remote)                                                 | 2     |
| Module type override (load .txt as JS, load .dat as JSON)                                    | 2     |
| Source maps (TS module transformation)                                                       | 1     |
| Clear cache command (never mode + clear-cache)                                               | 1     |
| Invocable scripts (register, execute, TS, invokeCommand, checkCallback, editor, editorCheck) | 7     |
| Code buttons (render, autoRun, isRaw, import transform)                                      | 4     |
| Code-button context (renderMarkdown, insertBefore/After, remove, replace)                    | 5     |
| Code-button config (shouldAutoOutput, shouldWrapConsole, removeAfterExecution)               | 3     |
| Startup script (invoke, cleanup+reload)                                                      | 2     |
| Protocol handler (module via code, inline code)                                              | 2     |
| Temp plugin registry (API access, register+unregister)                                       | 2     |
| File URLs (file:/// async + sync)                                                            | 2     |
| Resource URLs (resource prefix async + sync)                                                 | 2     |
| HTTP URLs (requireAsync from CDN)                                                            | 1     |
| Synchronous require (all desktop-supported modules)                                          | 16    |
| Emulate-mobile (all mobile features, file/resource/HTTP URLs, sync/electron/node throw)      | 19    |
| Android (all mobile features, file/resource/HTTP URLs, sync/electron/node throw)             | 18    |
| Smoke test                                                                                   | 2     |

## Remaining gaps to investigate

Features that exist in code but may lack one or more of: docs, demo vault, integration test.

### Identified gaps

**Demo vault gap:**

- `requireAsyncWrapper()` — documented + tested but no interactive demo

**Integration test gaps** (documented + demoed but no test):

- WASM modules, ASAR archives, node binaries (need binary populate support)
- Hotkey assignment (UI-only feature, not programmatically testable)

**Docs gaps:**

- Plugin integrations (CustomJS, Dataview, Datacore, Templater, QuickAdd, JS Engine, Modules) — have dedicated demo vault pages with bidirectional examples; docs mention them in context (core-functions.md, dynamic-import.md) but no dedicated integration guide pages

### Next steps

1. Add integration tests for remaining gaps (WASM, ASAR, hotkey)
2. Add `requireAsyncWrapper()` demo to vault
3. Consider adding docs pages for plugin integrations (currently demo-vault-only)

## Known Issues

### CLI eval interference from async code-button execution

When a `code-button` block with `shouldAutoRun: true` and an `import` statement is rendered in preview mode, the Babel pipeline transforms the import into `requireAsyncWrapper(async (require) => { ... })`. This async execution may still be in flight when the next `obsidian eval` CLI call arrives, causing the CLI output to include the string `"function"` (the return value of `requireAsyncWrapper`) interleaved with the expected JSON result.

**Minimal repro**: Open a note in preview mode containing:

````markdown
```code-button
---
shouldAutoRun: true
---
import { Notice } from "obsidian";
```
````

Then in a SEPARATE test file, call `evalInObsidian()`. The call fails with `Obsidian returned non-JSON output: function`.

**Workaround**: Call `app.workspace.detachLeavesOfType('markdown')` in `afterAll` to close markdown leaves before subsequent test files run.

**Scope**: Only affects cross-file test execution. Same-file `evalInObsidian` calls work fine.

**TODO**: Once fixed in `obsidian-integration-testing`, remove the `afterAll` workaround in `src/code-button-block.desktop.integration.test.ts` that calls `app.workspace.detachLeavesOfType('markdown')`.
