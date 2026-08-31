import type { DataviewInlineApi } from 'obsidian-dev-utils/obsidian/dataview';

/**
 * The question this module answers: which folder to list the notes of.
 */
interface NotesInFolderQuery {
  folder: string;
}

/**
 * Renders every note in a folder, alphabetically.
 *
 * @param dv - The Dataview inline API of the block being rendered.
 * @param query - The folder to list, as a vault-root-relative path.
 */
export function runQuery(dv: DataviewInlineApi, query: NotesInFolderQuery): void {
  const pages = dv.pages(`"${query.folder}"`).sort((page) => page.file.name);

  dv.table(['Note', 'Size'], pages.map((page) => [page.file.link, `${String(page.file.size)} bytes`]));
}
