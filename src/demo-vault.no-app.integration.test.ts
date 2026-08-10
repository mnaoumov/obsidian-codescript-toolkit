import process from 'node:process';
import { registerDemoVaultCoverageSuite } from 'obsidian-dev-utils/script-utils/demo-vault-coverage';
import { getRootFolder } from 'obsidian-dev-utils/script-utils/root';

// Keeps the in-repo `demo-vault/` in sync with the plugin's public surface WITHOUT
// Launching Obsidian: it reflects the real API/config from source and asserts
// Every feature is demonstrated, and that the notes reference no API member that no
// Longer exists (rename drift). The runtime behavior of the plugin is covered by the
// Other integration tests, not by the demo vault.
//
// No `docs` spec: the demo vault IS the documentation now, so there is no second
// Surface to check parity against. `docs/` holds only redirect stubs pointing here.
registerDemoVaultCoverageSuite({
  configInterfaces: [{ interfaceName: 'CodeButtonBlockConfig', sourcePath: 'src/code-button-block-config.ts' }],
  interfaces: [{
    interfaceName: 'CodeButtonContext',
    kind: 'methods',
    receiver: 'codeButtonContext',
    sourcePath: 'src/code-button-context.ts'
  }],
  nonTrivialGuard: {
    expectDemoNote: '43 Code button context.md',
    expectMember: 'registerTempPlugin',
    interfaceName: 'CodeButtonContext',
    sourcePath: 'src/code-button-context.ts'
  },
  rootFolder: getRootFolder() ?? process.cwd()
});
