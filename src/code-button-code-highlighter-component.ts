import { SyntaxHighlightingComponent } from 'obsidian-dev-utils/obsidian/components/syntax-highlighting-component';

export const CODE_BUTTON_BLOCK_LANGUAGE = 'code-button';

export class CodeButtonCodeHighlighterComponent extends SyntaxHighlightingComponent {
  public override async onloadAsync(): Promise<void> {
    await super.onloadAsync();
    // No `prismGrammar`: unlike `code-script`, this fence is replaced by a button in reading view, so Prism never sees it there.
    // The `sourceVisibility` panel does show the code in reading view, but as its own ` ```ts ` fence rendered through
    // `MarkdownRenderer`, which Prism highlights with its built-in `typescript` grammar — still nothing to register here.
    await this.registerCodeBlockLanguage({
      editorMode: 'text/typescript',
      language: CODE_BUTTON_BLOCK_LANGUAGE
    });
  }
}
