const timestamp = new Date().toISOString();

export function cacheInvalidationModeNever() {
  const message = `Cache invalidation mode = never. Timestamp: ${timestamp}`;
  new Notice(message);
  console.log(message);
}
