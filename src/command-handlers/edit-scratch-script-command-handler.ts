import { GlobalCommandHandler } from '@mnaoumov/obsidian-lib/command-handlers/global-command-handler';

import type { ScratchScript } from '../vault-scripts/scratch-script.ts';

export class EditScratchScriptCommandHandler extends GlobalCommandHandler {
  public constructor(private readonly scratchScript: ScratchScript) {
    super({
      icon: 'file-code',
      id: 'edit-scratch-script',
      name: 'Edit scratch script'
    });
  }

  public override async execute(): Promise<void> {
    await this.scratchScript.edit();
  }
}
