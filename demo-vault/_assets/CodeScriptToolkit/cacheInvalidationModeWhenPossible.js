const timestamp = new Date().toISOString();

export function cacheInvalidationModeWhenPossible() {
  const message = `Cache invalidation mode = whenPossible. Timestamp: ${timestamp}`;
  new Notice(message);
  console.log(message);
}
