import type {
  App,
  MarkdownView
} from 'obsidian';
import type { DataviewInlineApi } from 'obsidian-dev-utils/obsidian/dataview';

import {
  CalloutMode,
  renderCallout
} from 'obsidian-dev-utils/obsidian/callout';
import { getFrontmatterSafe } from 'obsidian-dev-utils/obsidian/metadata-cache';

/**
 * The two keys the host note carries: which module answers the question, and the question itself.
 */
interface QueryFrontmatter {
  query: unknown;
  queryModulePath: string;
}

/**
 * The contract every query module satisfies. The return value may be a `Promise`, so a module that has
 * nothing to await can stay synchronous.
 */
interface QueryModule {
  runQuery(dv: DataviewInlineApi, query: unknown): Promise<void> | void;
}

const QUERY_NOTE_PATH = '_assets/CodeScriptToolkit/Query.md';

/**
 * Loads the module named by the host note's frontmatter and lets it render the query. This is what the
 * single `dataviewjs` block in `Query.md` calls.
 *
 * @param dv - The Dataview inline API of the block being rendered.
 */
export async function executeQuery(dv: DataviewInlineApi): Promise<void> {
  // `getFrontmatterSafe` waits for the metadata cache to catch up with the file on disk, so the query
  // just written by `runQuery()` is the one read back here rather than the previous one.
  const frontmatter = await getFrontmatterSafe<QueryFrontmatter>(dv.app, QUERY_NOTE_PATH);

  if (frontmatter.queryModulePath === undefined) {
    renderError(dv, `Key \`queryModulePath\` is not set in the \`${QUERY_NOTE_PATH}\` frontmatter.`);
    return;
  }

  if (frontmatter.query === undefined) {
    renderError(dv, `Key \`query\` is not set in the \`${QUERY_NOTE_PATH}\` frontmatter.`);
    return;
  }

  const queryModule = await requireAsync(frontmatter.queryModulePath) as Partial<QueryModule>;

  if (!queryModule.runQuery) {
    renderError(dv, `\`${frontmatter.queryModulePath}\` does not export a \`runQuery()\` function.`);
    return;
  }

  dv.paragraph(`**Query module**: \`${frontmatter.queryModulePath}\``);
  dv.paragraph(`**Query**: \`${JSON.stringify(frontmatter.query)}\``);
  await queryModule.runQuery(dv, frontmatter.query);
}

/**
 * Points the host note at a query module with a query value, and opens it in preview so the view renders.
 *
 * @param app - Obsidian app instance.
 * @param queryModulePath - Path of the module that renders the query, in any form `requireAsync()` accepts.
 * @param query - The question itself. Anything that survives a YAML round-trip.
 */
export async function runQuery(app: App, queryModulePath: string, query: unknown): Promise<void> {
  const queryNote = app.vault.getFileByPath(QUERY_NOTE_PATH);

  if (!queryNote) {
    throw new Error(`Query note not found: ${QUERY_NOTE_PATH}`);
  }

  await app.fileManager.processFrontMatter(queryNote, (frontmatter: Partial<QueryFrontmatter>) => {
    frontmatter.queryModulePath = queryModulePath;
    frontmatter.query = query;
  });

  // Reuse the tab the host note is already in, so clicking a second query replaces the first result
  // instead of piling up tabs — and so the note you clicked from stays open beside it.
  const leaf = app.workspace.getLeavesOfType('markdown')
    .find((markdownLeaf) => (markdownLeaf.view as MarkdownView).file === queryNote)
    ?? app.workspace.getLeaf('tab');

  await leaf.openFile(queryNote, { state: { mode: 'preview' } });
  app.workspace.setActiveLeaf(leaf, { focus: true });

  // Dataview repaints its views on a timer — 2.5 seconds by default — so a host note that is already
  // open would sit on the previous answer for a noticeable moment. Asking for the refresh now makes the
  // change immediate; if the event is ever dropped this is a harmless no-op and the timer takes over.
  app.workspace.trigger('dataview:refresh-views');
}

function renderError(dv: DataviewInlineApi, message: string): void {
  renderCallout({
    contentProvider: message,
    dv,
    mode: CalloutMode.FoldableExpanded,
    type: 'ERROR'
  });
}
