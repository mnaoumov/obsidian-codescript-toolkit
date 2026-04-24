import type { App } from 'obsidian';

import { isMarkdownFile } from 'obsidian-dev-utils/obsidian/file-system';
import { parseFrontmatter } from 'obsidian-dev-utils/obsidian/frontmatter';
import { getFrontmatterSafe } from 'obsidian-dev-utils/obsidian/metadata-cache';

interface CodeScriptToolkitNoteSettingsFrontmatter {
  codeScriptToolkit?: CodeScriptToolkitNoteSettings;
}

export class CodeScriptToolkitNoteSettings {
  public defaultCodeScriptName = '';
  public invocableCodeScriptName = '';
  public isInvocable = false;
}

export async function getCodeScriptToolkitNoteSettings(app: App, path: string): Promise<CodeScriptToolkitNoteSettings> {
  if (!isMarkdownFile(app, path)) {
    return new CodeScriptToolkitNoteSettings();
  }

  const markdownFile = app.vault.getFileByPath(path);
  if (markdownFile) {
    const frontmatter = await getFrontmatterSafe<CodeScriptToolkitNoteSettingsFrontmatter>(app, markdownFile);
    return frontmatter.codeScriptToolkit ?? new CodeScriptToolkitNoteSettings();
  }

  const content = await app.vault.adapter.read(path);
  return getCodeScriptToolkitNoteSettingsFromContent(content);
}

export function getCodeScriptToolkitNoteSettingsFromContent(content: string): CodeScriptToolkitNoteSettings {
  const frontmatter = parseFrontmatter<CodeScriptToolkitNoteSettingsFrontmatter>(content);
  return frontmatter.codeScriptToolkit ?? new CodeScriptToolkitNoteSettings();
}
