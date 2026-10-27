const timestamp = new Date().toISOString();

export function cacheInvalidationModeAlways() {
  const message = `Cache invalidation mode = always. Timestamp: ${timestamp}`;
  new Notice(message);
  console.log(message);
}
