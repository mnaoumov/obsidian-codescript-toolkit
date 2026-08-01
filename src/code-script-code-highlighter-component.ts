import { SyntaxHighlightingComponent } from 'obsidian-dev-utils/obsidian/components/syntax-highlighting-component';

export const CODE_SCRIPT_BLOCK_LANGUAGE = 'code-script';

export class CodeScriptCodeHighlighterComponent extends SyntaxHighlightingComponent {
  public override async onloadAsync(): Promise<void> {
    await super.onloadAsync();
    await this.registerCodeBlockLanguageAsync({
      editorMode: 'text/typescript',
      language: CODE_SCRIPT_BLOCK_LANGUAGE,
      prismGrammar: 'typescript'
    });
  }
}
