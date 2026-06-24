import type { Plugin as ObsidianPlugin } from 'obsidian';

import type {
  RegisterTempPluginParams,
  TempPluginClass
} from './code-button-context.ts';
import type { CodeScriptToolkitModule } from './code-script-toolkit-module.ts';

import { TempPluginRegistryComponent } from './temp-plugin-registry.ts';

type CodeScriptToolkitModuleImplRegisterTempPluginParams<TPlugin extends ObsidianPlugin = ObsidianPlugin> = RegisterTempPluginParams<TPlugin>;

export class CodeScriptToolkitModuleImpl implements CodeScriptToolkitModule {
  public constructor(private readonly tempPluginRegistry: TempPluginRegistryComponent) {
    this.getTempPlugin = this.getTempPlugin.bind(this);
    this.registerTempPlugin = this.registerTempPlugin.bind(this);
    this.unregisterTempPlugin = this.unregisterTempPlugin.bind(this);
  }

  public getTempPlugin(tempPluginClass: string | TempPluginClass): null | ObsidianPlugin {
    return this.tempPluginRegistry.getTempPlugin(tempPluginClass);
  }

  public async registerTempPlugin<TPlugin extends ObsidianPlugin = ObsidianPlugin>(
    params: CodeScriptToolkitModuleImplRegisterTempPluginParams<TPlugin>
  ): Promise<null | TPlugin> {
    return await this.tempPluginRegistry.registerTempPlugin<TPlugin>(params);
  }

  public unregisterTempPlugin(tempPluginClass: string | TempPluginClass): void {
    this.tempPluginRegistry.unregisterTempPlugin(tempPluginClass);
  }
}
