# Parent relative path

A fixture for [04 Relative path](<../01 Where your code lives/04 Relative path.md>). This note sits one folder down, so its requires have to climb back out with `../` — which is the case that breaks without the plugin, and the case `parentPath` exists to disambiguate.

```code-button
---
caption: Require parent relative path
---
const { parentRelativePath } = require('../_assets/CodeScriptToolkit/parentRelativePath.js');
parentRelativePath();
```

```code-button
---
caption: Require parent relative path with custom parent path
---
const { parentRelativePathWithCustomParentPath } = require('../_assets/CodeScriptToolkit/parentRelativePathWithCustomParentPath.js', { parentPath: 'Folder/Parent relative path.md' });
parentRelativePathWithCustomParentPath();
```
