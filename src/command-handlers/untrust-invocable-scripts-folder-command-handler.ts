import { GlobalCommandHandler } from '@mnaoumov/obsidian-lib/command-handlers/global-command-handler';

import type { InvocableScriptsFolderTrust } from '../vault-scripts/invocable-scripts-folder-trust.ts';

interface UntrustInvocableScriptsFolderCommandHandlerConstructorParams {
  readonly invocableScriptsFolderTrust: InvocableScriptsFolderTrust;
  readonly registerInvocableScripts: () => Promise<void>;
}

/**
 * Stops trusting the configured invocable scripts folder on this device, which unregisters its scripts' commands.
 *
 * Shown only while the folder is trusted.
 */
export class UntrustInvocableScriptsFolderCommandHandler extends GlobalCommandHandler {
  private readonly invocableScriptsFolderTrust: InvocableScriptsFolderTrust;
  private readonly registerInvocableScripts: () => Promise<void>;

  public constructor(params: UntrustInvocableScriptsFolderCommandHandlerConstructorParams) {
    super({
      icon: 'shield-off',
      id: 'untrust-invocable-scripts-folder',
      name: 'Untrust invocable scripts folder'
    });
    this.invocableScriptsFolderTrust = params.invocableScriptsFolderTrust;
    this.registerInvocableScripts = params.registerInvocableScripts;
  }

  public override canExecute(): boolean {
    return this.invocableScriptsFolderTrust.isTrusted();
  }

  public override async execute(): Promise<void> {
    this.invocableScriptsFolderTrust.untrust();
    await this.registerInvocableScripts();
  }
}
