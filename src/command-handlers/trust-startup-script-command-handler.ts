import { GlobalCommandHandler } from '@mnaoumov/obsidian-lib/command-handlers/global-command-handler';

import type { StartupScriptTrust } from '../vault-scripts/startup-script-trust.ts';

interface TrustStartupScriptCommandHandlerConstructorParams {
  readonly reloadStartupScript: () => Promise<void>;
  readonly startupScriptTrust: StartupScriptTrust;
}

/**
 * Asks to trust the configured startup script on this device, and runs it once trusted.
 *
 * Shown only while a startup script is configured and is not trusted.
 */
export class TrustStartupScriptCommandHandler extends GlobalCommandHandler {
  private readonly reloadStartupScript: () => Promise<void>;
  private readonly startupScriptTrust: StartupScriptTrust;

  public constructor(params: TrustStartupScriptCommandHandlerConstructorParams) {
    super({
      icon: 'shield-check',
      id: 'trust-startup-script',
      name: 'Trust startup script'
    });
    this.reloadStartupScript = params.reloadStartupScript;
    this.startupScriptTrust = params.startupScriptTrust;
  }

  public override canExecute(): boolean {
    return !!this.startupScriptTrust.getPath() && !this.startupScriptTrust.isTrusted();
  }

  public override async execute(): Promise<void> {
    if (await this.startupScriptTrust.promptForTrust()) {
      await this.reloadStartupScript();
    }
  }
}
