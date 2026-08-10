# Source maps

Your TypeScript is transpiled before it runs, so without source maps the debugger would show you generated JavaScript with the wrong line numbers. Source maps are generated and registered for you, which means breakpoints, stack traces and stepping all land on the code you actually wrote.

Open `DevTools Console` with `Ctrl/Command + Shift + I`, then click the button: execution stops at the `debugger` statement, in this note's source, where you can inspect `variable` and `anotherVariable`.

```code-button
---
caption: Source maps
---
console.warn('Debugger will stop on a breakpoint and you can investigate the code, observe variables etc. Press F8 to continue.');
const variable = 42;
const anotherVariable = 'hello';
debugger;
```

## Platform support

| Desktop | Mobile |
| ------- | ------ |
| ✅      | ✅     |
