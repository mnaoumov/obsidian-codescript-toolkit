[Docs](https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/docs/code-buttons.md)

# Code button config

[Docs](https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/docs/code-button-config.md)

## Button with default caption

```code-button
import { Notice } from 'obsidian';
const message = 'Button with default caption';
new Notice(message);
console.log(message);
```

## Button in raw mode (auto-executing, no visible)

```code-button
---
isRaw: true
---
import { Notice } from 'obsidian';
const message = 'Button in raw mode (auto-executing, no visible)';
new Notice(message);
console.log(message);
```

## Other

after removing button the gap will be left

```code-button
---
caption: Button in removeAfterExecution mode, keep gap
removeAfterExecution:
  when: always
  shouldKeepGap: true
---
import { Notice } from 'obsidian';
const message = 'Button in removeAfterExecution mode, keep gap';
new Notice(message);
console.log(message);
```

after removing button the gap will be left

after removing button the gap will NOT be left

```code-button
---
caption: Button in removeAfterExecution mode, no gap
removeAfterExecution:
  when: always
  shouldKeepGap: false
---
import { Notice } from 'obsidian';
const message = 'Button in removeAfterExecution mode, no gap';
new Notice(message);
console.log(message);
```

after removing button the gap will NOT be left

```code-button
---
caption: Button in removeAfterExecution mode, on success only
removeAfterExecution:
  when: onSuccess
---
import { Notice } from 'obsidian';
new Notice('Ran successfully - this button removes itself on success');
```

```code-button
---
caption: Button in removeAfterExecution mode, on error only
removeAfterExecution:
  when: onError
---
throw new Error('Failed on purpose - this button removes itself on error');
```

```code-button
---
caption: Button in shouldAutoOutput=false mode
shouldAutoOutput: false
---
import { Notice } from 'obsidian';
const message = 'Button in shouldAutoOutput=false mode';
new Notice(message);
console.log(message);
```

```code-button
---
caption: Button in shouldAutoRun=true mode
shouldAutoRun: true
---
import { Notice } from 'obsidian';
const message = 'Button in shouldAutoRun=true mode';
new Notice(message);
console.log(message);
```

```code-button
---
caption: Button in shouldShowSystemMessages=false mode
shouldShowSystemMessages: false
---
import { Notice } from 'obsidian';
const message = 'Button in shouldShowSystemMessages=false mode';
new Notice(message);
console.log(message);
```

```code-button
---
caption: Button in shouldWrapConsole=false mode
shouldWrapConsole: false
---
import { Notice } from 'obsidian';
const message = 'Button in shouldWrapConsole=false mode';
new Notice(message);
console.log(message);
```

# Code button context

[Docs](https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/docs/code-button-context.md)

```code-button
---
caption: Container
---
codeButtonContext.container.createEl('button', { text: 'Container' });
```

```code-button
---
caption: registerTempPlugin
---
import { Notice, Plugin } from 'obsidian';

class MyTempPlugin extends Plugin {
  public override onload(): void {
    this.addCommand({
      id: 'temp-command',
      name: 'Temp command',
      callback: () => {
        new Notice('Temp command');
        console.log('Temp command');
      }
    })
  }
}

const cssText = '* { color: red; }';

codeButtonContext.registerTempPlugin({ tempPluginClass: MyTempPlugin, cssText });

codeButtonContext.container.createEl('button', {
  text: 'Unregister'
}, (button) => {
  button.addEventListener('click', () => {
    app.commands.executeCommandById('fix-require-modules:unregister-temp-plugin-MyTempPlugin');
  });
});
```

```code-button
---
caption: getTempPlugin
---
const tempPlugin = codeButtonContext.getTempPlugin('MyTempPlugin');
new Notice(`Temp plugin: ${tempPlugin ? 'found' : 'not found'}`);
```

```code-button
---
caption: renderMarkdown
---
codeButtonContext.renderMarkdown('**hello**');
```

```code-button
---
caption: insertBeforeCodeButtonBlock
---
await codeButtonContext.insertBeforeCodeButtonBlock({ markdown: '**bar**' });
```

```code-button
---
caption: insertAfterCodeButtonBlock
---
await codeButtonContext.insertAfterCodeButtonBlock({ markdown: '**foo**' });
```

```code-button
---
caption: removeCodeButtonBlock
---
await codeButtonContext.removeCodeButtonBlock();
```

```code-button
---
caption: replaceCodeButtonBlock
---
await codeButtonContext.replaceCodeButtonBlock({ markdown: '**baz**' });
```
