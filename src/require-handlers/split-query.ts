interface SplitQueryResult {
  readonly cleanStr: string;
  readonly query: string;
}

export function splitQuery(str: string): SplitQueryResult {
  const queryIndex = str.indexOf('?');
  return {
    cleanStr: queryIndex === -1 ? str : str.slice(0, queryIndex),
    query: queryIndex === -1 ? '' : str.slice(queryIndex)
  };
}
