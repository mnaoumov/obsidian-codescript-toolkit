# Scratch script

A throwaway script slot. Rewrite the block below for whatever one-off job comes up, then run the `CodeScript Toolkit: Run scratch script` command.

```code-script
import type { App } from 'obsidian';

import { Notice } from 'obsidian';

export async function invoke(app: App): Promise<void> {
  const noteCount = app.vault.getMarkdownFiles().length;
  new Notice(`This vault has ${noteCount} notes.`);
}
```
