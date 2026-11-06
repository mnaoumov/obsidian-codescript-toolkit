import type { PluginNoticeComponent } from '@mnaoumov/obsidian-lib/components/plugin-notice-component';
import type {
  App,
  TFile
} from 'obsidian';

import { createFolderSafe } from '@mnaoumov/obsidian-lib/vault';
import { printError } from '@mnaoumov/typescript-lib/error';
import { dirname } from '@mnaoumov/typescript-lib/path';

import type { RequireHandlerFactoryComponent } from '../require-handlers/require-handler-factory.ts';
import type { PluginSettingsComponent } from '../settings/plugin-settings-component.ts';
import type { Script } from './script.ts';

import { CODE_SCRIPT_BLOCK_LANGUAGE } from './code-script-code-highlighter-component.ts';

/**
 * The note a missing scratch script is created with: a heading, one line saying what the note is for, and a
 * `code-script` block holding an empty `invoke()`.
 */
export const SCRATCH_SCRIPT_TEMPLATE = `# Scratch script

A throwaway script slot. Rewrite the block below for whatever one-off job comes up, then run the \`CodeScript Toolkit: Run scratch script\` command.

\`\`\`${CODE_SCRIPT_BLOCK_LANGUAGE}
import type { App } from 'obsidian';

export async function invoke(app: App): Promise<void> {
  // Your one-off code goes here.
}
\`\`\`
`;

interface ScratchScriptConstructorParams {
  readonly app: App;
  readonly pluginNoticeComponent: PluginNoticeComponent;
  readonly pluginSettingsComponent: PluginSettingsComponent;
  readonly requireHandlerFactoryComponent: RequireHandlerFactoryComponent;
}

/**
 * The scratch script: one note whose `code-script` block is rewritten for each one-off job and run by a command,
 * without opening the note.
 */
export class ScratchScript {
  private readonly app: App;
  private readonly pluginNoticeComponent: PluginNoticeComponent;
  private readonly pluginSettingsComponent: PluginSettingsComponent;
  private readonly requireHandlerFactoryComponent: RequireHandlerFactoryComponent;

  public constructor(params: ScratchScriptConstructorParams) {
    this.app = params.app;
    this.pluginNoticeComponent = params.pluginNoticeComponent;
    this.pluginSettingsComponent = params.pluginSettingsComponent;
    this.requireHandlerFactoryComponent = params.requireHandlerFactoryComponent;
  }

  /**
   * Opens the scratch script note, creating it from {@link SCRATCH_SCRIPT_TEMPLATE} when it does not exist.
   */
  public async edit(): Promise<void> {
    const path = this.getPath();
    if (!path) {
      return;
    }

    const file = await this.getOrCreateFile(path);
    await this.app.workspace.getLeaf(false).openFile(file);
  }

  /**
   * Runs the scratch script's `invoke()`. A missing note is created and opened instead, so the empty skeleton is
   * never run.
   */
  public async run(): Promise<void> {
    const path = this.getPath();
    if (!path) {
      return;
    }

    if (!this.app.vault.getFileByPath(path)) {
      const file = await this.getOrCreateFile(path);
      await this.app.workspace.getLeaf(false).openFile(file);
      this.pluginNoticeComponent.showNotice(`Scratch script created: ${path}. Write your code in it, then run the command again.`);
      return;
    }

    try {
      const script = await this.requireHandlerFactoryComponent.requireVaultScriptAsync(path) as Partial<Script>;
      if (typeof script.invoke !== 'function') {
        throw new TypeError(`${path} does not export an \`invoke()\` function. Add \`export async function invoke(app) { ... }\` to its ${CODE_SCRIPT_BLOCK_LANGUAGE} block.`);
      }
      await script.invoke(this.app);
    } catch (error) {
      const wrappedError = new Error(`Error running scratch script ${path}`, { cause: error });
      printError(wrappedError);
      const reason = error instanceof Error ? error.message : String(error);
      this.pluginNoticeComponent.showNotice(`${wrappedError.message}: ${reason}\nSee console for details.`);
      return;
    }

    this.pluginNoticeComponent.showNotice('Scratch script finished');
  }

  private async getOrCreateFile(path: string): Promise<TFile> {
    const existingFile = this.app.vault.getFileByPath(path);
    if (existingFile) {
      return existingFile;
    }

    const folderPath = dirname(path);
    if (folderPath && folderPath !== '.') {
      await createFolderSafe(this.app, folderPath);
    }

    return await this.app.vault.create(path, SCRATCH_SCRIPT_TEMPLATE);
  }

  private getPath(): string {
    const path = this.pluginSettingsComponent.settings.getScratchScriptPath();
    if (!path) {
      this.pluginNoticeComponent.showNotice('Scratch script path is not configured. Set it in the plugin settings.');
    }
    return path;
  }
}
