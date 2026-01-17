import { Notice } from 'obsidian';
import { printError } from 'obsidian-dev-utils/Error';
import { CommandInvocationBase } from 'obsidian-dev-utils/obsidian/Commands/CommandBase';
import { NonEditorCommandBase } from 'obsidian-dev-utils/obsidian/Commands/NonEditorCommandBase';
import { isMarkdownFile } from 'obsidian-dev-utils/obsidian/FileSystem';
import { join } from 'obsidian-dev-utils/Path';

import type { Plugin } from '../Plugin.ts';
import type { Script } from '../Script.ts';

import { getCodeScriptToolkitNoteSettings } from '../CodeScriptToolkitNoteSettings.ts';
import { requireVaultScriptAsync } from '../RequireHandlerUtils.ts';

export const INVOKE_SCRIPT_FILE_COMMAND_NAME_PREFIX = 'invoke-script-file-';

class InvokeScriptCommandInvocation extends CommandInvocationBase<Plugin> {
  public constructor(plugin: Plugin, private readonly scriptFile: string) {
    super(plugin);
  }

  public override async execute(): Promise<void> {
    await invoke(this.plugin, join(this.plugin.settings.getInvocableScriptsFolder(), this.scriptFile));
  }
}

export class InvokeScriptCommand extends NonEditorCommandBase<Plugin> {
  public constructor(plugin: Plugin, private readonly scriptFile: string) {
    super({
      icon: 'play',
      id: `${INVOKE_SCRIPT_FILE_COMMAND_NAME_PREFIX}${scriptFile}`,
      name: `Invoke script: ${scriptFile}`,
      plugin
    });
  }

  protected override createCommandInvocation(): CommandInvocationBase {
    return new InvokeScriptCommandInvocation(this.plugin, this.scriptFile);
  }
}

export async function invoke(plugin: Plugin, scriptPath: string, isStartup?: boolean): Promise<void> {
  const app = plugin.app;
  const scriptString = isStartup ? 'startup script' : 'script';
  plugin.consoleDebug(`Invoking ${scriptString}: ${scriptPath}.`);
  try {
    if (!await app.vault.adapter.exists(scriptPath)) {
      throw new Error(`Script not found: '${scriptPath}'.`);
    }

    if (isMarkdownFile(app, scriptPath)) {
      const settings = await getCodeScriptToolkitNoteSettings(app, scriptPath);
      if (!settings.isInvocable) {
        throw new Error(`Script is not invocable: '${scriptPath}'.`);
      }
      if (settings.invocableCodeScriptName) {
        scriptPath += `?codeScriptName=${settings.invocableCodeScriptName}`;
      }
    }
    const script = await requireVaultScriptAsync(scriptPath) as Partial<Script>;
    const invokeFn = script.invoke?.bind(script);
    if (typeof invokeFn !== 'function') {
      throw new Error(`${scriptPath} does not export invoke() function`);
    }
    await invokeFn(app);
    plugin.consoleDebug(`${scriptString} ${scriptPath} executed successfully`);
  } catch (error) {
    new Notice(`Error invoking ${scriptString} ${scriptPath}
See console for details...`);
    printError(new Error(`Error invoking ${scriptString} ${scriptPath}`, { cause: error }));
  }
}
