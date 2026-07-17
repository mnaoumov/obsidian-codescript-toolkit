[Docs](https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/docs/markdown.md)

```code-button
---
caption: Require Markdown files
---
const { markdown } = require('/module.md');
markdown();
```

```code-button
---
caption: Require Markdown files with named script block
---
const { markdownWithNamedScriptBlock } = require('/module.md?codeScriptName=namedScriptBlock');
markdownWithNamedScriptBlock();
```

```code-button
---
caption: Require Markdown files with default named script block
---
const { markdownWithDefaultNamedScriptBlock } = require('/defaultNamedModule.md');
markdownWithDefaultNamedScriptBlock();
```

## Invocable Markdown module

- Invoke command `CodeScript ToolkitInvoke Script: invocableMarkdownModule.md`
- Invoke command `CodeScript ToolkitInvoke Script: namedInvocableMarkdownModule.md`
