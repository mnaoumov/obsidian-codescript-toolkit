import { GlobalCommandHandler } from '@mnaoumov/obsidian-lib/command-handlers/global-command-handler';

import type { ScratchScript } from '../vault-scripts/scratch-script.ts';

export class RunScratchScriptCommandHandler extends GlobalCommandHandler {
  public constructor(private readonly scratchScript: ScratchScript) {
    super({
      icon: 'play',
      id: 'run-scratch-script',
      name: 'Run scratch script'
    });
  }

  public override async execute(): Promise<void> {
    await this.scratchScript.run();
  }
}
