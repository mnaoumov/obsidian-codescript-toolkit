import type { DataviewInlineApi } from 'obsidian-dev-utils/obsidian/dataview';

/**
 * The question this module answers: how many of the most recently modified notes to list.
 */
interface RecentlyModifiedQuery {
  limit: number;
}

// The vault's code fixtures are notes only by extension, so they are kept out of the results.
const SOURCE = '-"_assets"';

/**
 * Renders the most recently modified notes in the vault.
 *
 * @param dv - The Dataview inline API of the block being rendered.
 * @param query - How many notes to list.
 */
export function runQuery(dv: DataviewInlineApi, query: RecentlyModifiedQuery): void {
  const pages = dv.pages(SOURCE)
    .sort((page) => page.file.mtime, 'desc')
    .limit(query.limit);

  dv.table(['Note', 'Modified'], pages.map((page) => [page.file.link, page.file.mtime]));
}
