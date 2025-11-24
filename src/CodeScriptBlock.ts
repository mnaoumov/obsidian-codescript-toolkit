import { Plugin } from 'obsidian';
import { throwExpression } from 'obsidian-dev-utils/Error';
import { loadPrism } from 'obsidian-typings/implementations';

export const CODE_SCRIPT_BLOCK_LANGUAGE = 'code-script';

export async function registerCodeScriptBlock(plugin: Plugin): Promise<void> {
  window.CodeMirror.defineMode(CODE_SCRIPT_BLOCK_LANGUAGE, (config) => window.CodeMirror.getMode(config, 'text/typescript'));
  const prism = await loadPrism();
  prism.languages[CODE_SCRIPT_BLOCK_LANGUAGE] = prism.languages['typescript'] ?? throwExpression(new Error('Prism typescript language not found.'));

  plugin.register(() => {
    window.CodeMirror.defineMode(CODE_SCRIPT_BLOCK_LANGUAGE, (config) => window.CodeMirror.getMode(config, 'null'));
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- Need to delete language.
    delete prism.languages[CODE_SCRIPT_BLOCK_LANGUAGE];
  });
}
