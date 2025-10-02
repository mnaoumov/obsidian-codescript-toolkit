import { join } from 'obsidian-dev-utils/Path';

export class PluginSettings {
  public invocableScriptsFolder = '';
  // eslint-disable-next-line no-magic-numbers -- Magic numbers are OK in settings.
  public mobileChangesCheckingIntervalInSeconds = 30;
  public modulesRoot = '';
  public shouldHandleProtocolUrls = false;
  public shouldUseSyncFallback = false;
  public startupScriptPath = '';

  public getInvocableScriptsFolder(): string {
    return this.getPathRelativeToModulesRoot(this.invocableScriptsFolder);
  }

  public getStartupScriptPath(): string {
    return this.getPathRelativeToModulesRoot(this.startupScriptPath);
  }

  private getPathRelativeToModulesRoot(path: string): string {
    if (!path) {
      return '';
    }

    if (!this.modulesRoot) {
      return path;
    }

    return join(this.modulesRoot, path);
  }
}
