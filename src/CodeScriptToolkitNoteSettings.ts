import type { App } from 'obsidian';

import { isMarkdownFile } from 'obsidian-dev-utils/obsidian/FileSystem';
import { parseFrontmatter } from 'obsidian-dev-utils/obsidian/Frontmatter';
import { getFrontmatterSafe } from 'obsidian-dev-utils/obsidian/MetadataCache';

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
