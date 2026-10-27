const timestamp = new Date().toISOString();

export function cacheInvalidationModeWhenPossibleWithQueryString() {
  const message = `Cache invalidation mode = whenPossible with query string. Timestamp: ${timestamp}`;
  new Notice(message);
  console.log(message);
}
