import type { TempPluginClass } from './code-button-context.ts';
import type { CodeScriptToolkitModule } from './code-script-toolkit-module.ts';

import {
  TempPluginRegistry,
  unregisterTempPlugin
} from './temp-plugin-registry.ts';

export class CodeScriptToolkitModuleImpl implements CodeScriptToolkitModule {
  public constructor(private readonly tempPluginRegistry: TempPluginRegistry) {
  }

  public registerTempPlugin(tempPluginClass: TempPluginClass, cssText?: string): void {
    this.tempPluginRegistry.registerTempPlugin({
      cssText: cssText ?? '',
      tempPluginClass
    });
  }

  public unregisterTempPlugin(tempPluginClassName: string): void {
    unregisterTempPlugin(tempPluginClassName);
  }
}
