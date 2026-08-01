import type { SyntaxHighlightingComponent } from 'obsidian-dev-utils/obsidian/components/syntax-highlighting-component';

import { ComponentEx } from 'obsidian-dev-utils/obsidian/components/component-ex';

export const CODE_SCRIPT_BLOCK_LANGUAGE = 'code-script';

interface CodeScriptBlockComponentConstructorParams {
  readonly syntaxHighlightingComponent: SyntaxHighlightingComponent;
}

export class CodeScriptBlockComponent extends ComponentEx {
  private readonly syntaxHighlightingComponent: SyntaxHighlightingComponent;

  public constructor(params: CodeScriptBlockComponentConstructorParams) {
    super();
    this.syntaxHighlightingComponent = params.syntaxHighlightingComponent;
  }

  public override async onloadAsync(): Promise<void> {
    await this.syntaxHighlightingComponent.registerCodeBlockLanguageAsync({
      editorMode: 'text/typescript',
      language: CODE_SCRIPT_BLOCK_LANGUAGE,
      prismGrammar: 'typescript'
    });
  }
}
