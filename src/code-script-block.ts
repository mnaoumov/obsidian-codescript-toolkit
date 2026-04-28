import { throwExpression } from 'obsidian-dev-utils/error';
import { AsyncComponentBase } from 'obsidian-dev-utils/obsidian/components/async-component';
import { loadPrism } from 'obsidian-typings/implementations';

import type { CodeScriptToolkitComponent } from './code-script-toolkit-component.ts';

export const CODE_SCRIPT_BLOCK_LANGUAGE = 'code-script';

export class CodeScriptBlockComponent extends AsyncComponentBase {
  public constructor(private readonly codeScriptToolkitComponent: CodeScriptToolkitComponent) {
    super();
  }

  public override async onload(): Promise<void> {
    await super.onload();
    await registerCodeScriptBlock(this.codeScriptToolkitComponent);
  }
}

export async function registerCodeScriptBlock(codeScriptToolkitComponent: CodeScriptToolkitComponent): Promise<void> {
  window.CodeMirror.defineMode(CODE_SCRIPT_BLOCK_LANGUAGE, (config) => window.CodeMirror.getMode(config, 'text/typescript'));
  const prism = await loadPrism();
  prism.languages[CODE_SCRIPT_BLOCK_LANGUAGE] = prism.languages['typescript'] ?? throwExpression(new Error('Prism typescript language not found.'));

  codeScriptToolkitComponent.register(() => {
    window.CodeMirror.defineMode(CODE_SCRIPT_BLOCK_LANGUAGE, (config) => window.CodeMirror.getMode(config, 'null'));
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- Need to delete language.
    delete prism.languages[CODE_SCRIPT_BLOCK_LANGUAGE];
  });
}
