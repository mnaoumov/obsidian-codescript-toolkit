import { GlobalCommandHandler } from '@mnaoumov/obsidian-lib/command-handlers/global-command-handler';

import type { StartupScriptTrust } from '../vault-scripts/startup-script-trust.ts';

interface UntrustStartupScriptCommandHandlerConstructorParams {
  readonly startupScriptTrust: StartupScriptTrust;
  readonly stopStartupScript: () => Promise<void>;
}

/**
 * Stops trusting the configured startup script on this device, and cleans up the running one.
 *
 * Shown only while the startup script is trusted.
 */
export class UntrustStartupScriptCommandHandler extends GlobalCommandHandler {
  private readonly startupScriptTrust: StartupScriptTrust;
  private readonly stopStartupScript: () => Promise<void>;

  public constructor(params: UntrustStartupScriptCommandHandlerConstructorParams) {
    super({
      icon: 'shield-off',
      id: 'untrust-startup-script',
      name: 'Untrust startup script'
    });
    this.startupScriptTrust = params.startupScriptTrust;
    this.stopStartupScript = params.stopStartupScript;
  }

  public override canExecute(): boolean {
    return this.startupScriptTrust.isTrusted();
  }

  public override async execute(): Promise<void> {
    this.startupScriptTrust.untrust();
    await this.stopStartupScript();
  }
}
