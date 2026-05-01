# Current Task

None.

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
