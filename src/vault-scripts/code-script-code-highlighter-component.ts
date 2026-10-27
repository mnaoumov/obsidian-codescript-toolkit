import { SyntaxHighlightingComponent } from '@mnaoumov/obsidian-lib/components/syntax-highlighting-component';

export const CODE_SCRIPT_BLOCK_LANGUAGE = 'code-script';

export class CodeScriptCodeHighlighterComponent extends SyntaxHighlightingComponent {
  public override async onloadAsync(): Promise<void> {
    await super.onloadAsync();
    await this.registerCodeBlockLanguage({
      editorMode: 'text/typescript',
      language: CODE_SCRIPT_BLOCK_LANGUAGE,
      prismGrammar: 'typescript'
    });
  }
}
