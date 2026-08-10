import type { Plugin as ObsidianPlugin } from 'obsidian';

import type {
  // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/43 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
  RegisterTempPluginParams,
  // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/43 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
  TempPluginClass
} from './code-button-context.ts';
import type { CodeScriptToolkitModule } from './code-script-toolkit-module.ts';

// eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/43 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
import { TempPluginRegistryComponent } from './temp-plugin-registry.ts';

// eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/43 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
type CodeScriptToolkitModuleImplRegisterTempPluginParams<TPlugin extends ObsidianPlugin = ObsidianPlugin> = RegisterTempPluginParams<TPlugin>;

export class CodeScriptToolkitModuleImpl implements CodeScriptToolkitModule {
  // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/43 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
  public constructor(private readonly tempPluginRegistry: TempPluginRegistryComponent) {
    // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/43 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
    this.getTempPlugin = this.getTempPlugin.bind(this);
    // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/43 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
    this.registerTempPlugin = this.registerTempPlugin.bind(this);
    // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/43 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
    this.unregisterTempPlugin = this.unregisterTempPlugin.bind(this);
  }

  // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/43 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
  public getTempPlugin(tempPluginClass: string | TempPluginClass): null | ObsidianPlugin {
    return this.tempPluginRegistry.getTempPlugin(tempPluginClass);
  }

  // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/43 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
  public async registerTempPlugin<TPlugin extends ObsidianPlugin = ObsidianPlugin>(
    params: CodeScriptToolkitModuleImplRegisterTempPluginParams<TPlugin>
  ): Promise<null | TPlugin> {
    return await this.tempPluginRegistry.registerTempPlugin<TPlugin>(params);
  }

  // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/43 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
  public unregisterTempPlugin(tempPluginClass: string | TempPluginClass): void {
    this.tempPluginRegistry.unregisterTempPlugin(tempPluginClass);
  }
}
