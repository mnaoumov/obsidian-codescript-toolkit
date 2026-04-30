import { evalInObsidian } from 'obsidian-integration-testing';
import { getTempVault } from 'obsidian-integration-testing/vitest-global-setup';
import {
  describe,
  expect,
  it
} from 'vitest';

function vaultPath(): string {
  return getTempVault().path;
}

describe('TempPluginRegistry integration', () => {
  it('should require codescript-toolkit module and access its API', async () => {
    const result = await evalInObsidian({
      async fn() {
        // Wait for layout ready so the codescript-toolkit module is initialized
        const LAYOUT_READY_DELAY_MS = 2000;
        await sleep(LAYOUT_READY_DELAY_MS);

        const requireAsync = Reflect.get(window, 'requireAsync') as (id: string) => Promise<Record<string, unknown>>;
        const cstModule = await requireAsync('codescript-toolkit');

        return {
          hasRegister: typeof cstModule['registerTempPlugin'] === 'function',
          hasUnregister: typeof cstModule['unregisterTempPlugin'] === 'function',
          keys: Object.keys(cstModule)
        };
      },
      vaultPath: vaultPath()
    });

    expect(result.hasRegister).toBe(true);
    expect(result.hasUnregister).toBe(true);
  });
});
