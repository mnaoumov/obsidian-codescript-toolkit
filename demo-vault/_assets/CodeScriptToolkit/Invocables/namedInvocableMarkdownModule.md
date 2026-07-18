---
codeScriptToolkit:
  invocableCodeScriptName: namedInvocableMarkdownModule
  isInvocable: true
---

```code-script
// codeScriptName: namedInvocableMarkdownModule
export function invoke() {
  const message = 'Named invocable markdown module';
  new Notice(message);
  console.log(message);
}
```
