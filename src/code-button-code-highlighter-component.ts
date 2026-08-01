import { SyntaxHighlightingComponent } from 'obsidian-dev-utils/obsidian/components/syntax-highlighting-component';

export const CODE_BUTTON_BLOCK_LANGUAGE = 'code-button';

export class CodeButtonCodeHighlighterComponent extends SyntaxHighlightingComponent {
  public override async onloadAsync(): Promise<void> {
    await super.onloadAsync();
    // No `prismGrammar`: unlike `code-script`, this fence is replaced by a button in reading view, so Prism has nothing to highlight there.
    await this.registerCodeBlockLanguageAsync({
      editorMode: 'text/typescript',
      language: CODE_BUTTON_BLOCK_LANGUAGE
    });
  }
}
