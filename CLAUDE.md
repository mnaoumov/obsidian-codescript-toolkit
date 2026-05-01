# Current Task

Comprehensive coverage analysis: ensure docs (`docs/`), integration tests (`src/*.desktop.integration.test.ts`), and demo vault (`obsidian-codescript-toolkit-demo-vault`) all cover every implemented feature.

## What's done

- 30 integration tests across 7 files, all passing
- Bug fix: ScriptFolderWatcher missed initial loadSettings event (component load ordering)
- Bug fix: broken relative links in docs/code-button-config.md and docs/code-button-context.md
- Workaround: afterAll detaches markdown leaves to avoid CLI eval interference
- Added dedent dependency for multiline strings
- Added strictProxy rule to global TypeScript rules

## Integration test coverage (30 tests)

|Feature|Tests|
|---|---|
|Module formats (CJS, ESM, CTS, MTS, JSON, MD)|6|
|Path resolution (relative, transitive)|2|
|Built-in modules (obsidian, @codemirror)|2|
|Async (top-level await, dynamic import, requireAsyncWrapper)|3|
|NPM modules from vault node_modules|1|
|Smart caching (cacheInvalidationMode: always)|1|
|Invocable scripts (register, execute, TS, invokeCommand)|4|
|Code buttons (render, autoRun, isRaw, import transform)|4|
|Startup script (invoke, cleanup+reload)|2|
|Protocol handler (module via code, inline code)|2|
|Temp plugin registry (API access, register+unregister)|2|
|Smoke test|1|

## Remaining gaps to investigate

Features that exist in code but may lack one or more of: docs, demo vault, integration test.

### Identified gaps from earlier analysis

- **Demo vault gap**: `requireAsyncWrapper()` — documented + tested but no interactive demo
- **Integration test gaps** (documented + demoed but no test): vault-root-relative paths, Node built-in modules, WASM, ASAR, file/resource/HTTP URLs, clear cache command, source maps, override module type, `obsidian/app` module, `obsidian/specialModuleNames`, `obsidian-dev-utils` module, `codescript-toolkit` module helpers, additional desktop modules (electron, @electron/remote), code-button context methods (container, renderMarkdown, insertBefore/After, removeCodeButtonBlock, replaceCodeButtonBlock)

### Next steps

1. Do a fresh systematic comparison of source code features vs docs vs demo vault vs tests
2. Identify any NEW features added since docs/demo vault were last updated
3. Add missing integration tests for the most important gaps
4. Add missing demo vault pages/scripts for undocumented features
5. Update docs for any missing features

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
