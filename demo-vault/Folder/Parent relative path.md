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
