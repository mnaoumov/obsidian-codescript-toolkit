interface SplitQueryResult {
  readonly cleanString: string;
  readonly query: string;
}

export function splitQuery($string: string): SplitQueryResult {
  const queryIndex = $string.indexOf('?');
  return {
    cleanString: queryIndex === -1 ? $string : $string.slice(0, queryIndex),
    query: queryIndex === -1 ? '' : $string.slice(queryIndex)
  };
}
