import process from 'node:process';
import { registerDemoVaultCoverageSuite } from 'obsidian-dev-utils/script-utils/demo-vault-coverage';
import { getRootFolder } from 'obsidian-dev-utils/script-utils/root';

// Keeps the in-repo `demo-vault/` in sync with the plugin's public surface WITHOUT
// Launching Obsidian: it reflects the real API/config/docs from source and asserts
// Every feature is demonstrated, and that the notes reference no API member that no
// Longer exists (rename drift). The runtime behavior of the plugin is covered by the
// Other integration tests, not by the demo vault.
registerDemoVaultCoverageSuite({
  configInterfaces: [{ interfaceName: 'CodeButtonBlockConfig', sourcePath: 'src/code-button-block-config.ts' }],
  docs: { folder: 'docs', nonFeatureDocs: ['core-functions', 'usage'] },
  interfaces: [{
    interfaceName: 'CodeButtonContext',
    kind: 'methods',
    receiver: 'codeButtonContext',
    sourcePath: 'src/code-button-context.ts'
  }],
  nonTrivialGuard: {
    expectDemoNote: '38 Code buttons.md',
    expectMember: 'registerTempPlugin',
    interfaceName: 'CodeButtonContext',
    sourcePath: 'src/code-button-context.ts'
  },
  rootFolder: getRootFolder() ?? process.cwd()
});
