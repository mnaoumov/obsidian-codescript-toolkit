[Docs](https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/docs/relative-path.md)

```code-button
---
caption: Require relative path
---
const { relativePath } = require('./_assets/CodeScriptToolkit/relativePath.js');
relativePath();
```

```code-button
---
caption: Require relative path with custom parent path
---
const { relativePathWithCustomParentPath } = require('./_assets/CodeScriptToolkit/relativePathWithCustomParentPath.js', { parentPath: 'Relative path.md' });
relativePathWithCustomParentPath();
```

See also [[Parent relative path]].
