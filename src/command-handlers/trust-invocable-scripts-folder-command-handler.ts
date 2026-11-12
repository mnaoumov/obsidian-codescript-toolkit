import { GlobalCommandHandler } from '@mnaoumov/obsidian-lib/command-handlers/global-command-handler';

import type { InvocableScriptsFolderTrust } from '../vault-scripts/invocable-scripts-folder-trust.ts';

interface TrustInvocableScriptsFolderCommandHandlerConstructorParams {
  readonly invocableScriptsFolderTrust: InvocableScriptsFolderTrust;
  readonly registerInvocableScripts: () => Promise<void>;
}

/**
 * Asks to trust the configured invocable scripts folder on this device, and registers its scripts once trusted.
 *
 * Shown only while a folder is configured and is not trusted.
 */
export class TrustInvocableScriptsFolderCommandHandler extends GlobalCommandHandler {
  private readonly invocableScriptsFolderTrust: InvocableScriptsFolderTrust;
  private readonly registerInvocableScripts: () => Promise<void>;

  public constructor(params: TrustInvocableScriptsFolderCommandHandlerConstructorParams) {
    super({
      icon: 'shield-check',
      id: 'trust-invocable-scripts-folder',
      name: 'Trust invocable scripts folder'
    });
    this.invocableScriptsFolderTrust = params.invocableScriptsFolderTrust;
    this.registerInvocableScripts = params.registerInvocableScripts;
  }

  public override canExecute(): boolean {
    return !!this.invocableScriptsFolderTrust.getFolder() && !this.invocableScriptsFolderTrust.isTrusted();
  }

  public override async execute(): Promise<void> {
    if (await this.invocableScriptsFolderTrust.promptForTrust()) {
      await this.registerInvocableScripts();
    }
  }
}
