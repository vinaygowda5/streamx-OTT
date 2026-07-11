const { log } = require("./logger");

/*
  Self-activating cache:
  - If REDIS_URL is set on Railway, uses real Redis (ioredis).
  - If not, silently falls back to an in-memory Map with the same TTL
    semantics, so the app works identically either way.
  - Every operation is wrapped in try/catch — a cache outage NEVER
    crashes a request. Worst case, it behaves as if there's no cache.
*/

let redis = null;
const memStore = new Map(); // key -> { value, expiresAt }

if (process.env.REDIS_URL) {
  try {
    const Redis = require("ioredis");
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 2,
      lazyConnect: true,
      retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000)), // give up after 3 tries
      reconnectOnError: () => false,
    });
    redis.on("error", (e) => log("warn", "redis_error", { message: e.message }));
    redis.connect().then(
      () => log("info", "redis_connected", {}),
      (e) => { log("warn", "redis_connect_failed_using_memory", { message: e.message }); redis = null; }
    );
  } catch (e) {
    log("warn", "ioredis_not_available_using_memory", { message: e.message });
    redis = null;
  }
}

async function get(key) {
  try {
    if (redis && redis.status === "ready") {
      const v = await redis.get(key);
      return v ? JSON.parse(v) : null;
    }
  } catch (e) { log("warn", "cache_get_failed", { key, message: e.message }); }

  const hit = memStore.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value;
  if (hit) memStore.delete(key);
  return null;
}

async function set(key, value, ttlSeconds = 60) {
  try {
    if (redis && redis.status === "ready") {
      await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
      return;
    }
  } catch (e) { log("warn", "cache_set_failed", { key, message: e.message }); }

  memStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

async function del(prefix) {
  try {
    if (redis && redis.status === "ready") {
      const keys = await redis.keys(`${prefix}*`);
      if (keys.length) await redis.del(...keys);
    }
  } catch (e) { log("warn", "cache_del_failed", { prefix, message: e.message }); }

  for (const k of memStore.keys()) if (k.startsWith(prefix)) memStore.delete(k);
}

// Wraps any async fetcher with cache-aside behavior
async function cached(key, ttlSeconds, fetchFn) {
  const hit = await get(key);
  if (hit !== null) return hit;
  const data = await fetchFn();
  await set(key, data, ttlSeconds);
  return data;
}

module.exports = { get, set, del, cached, isRedisActive: () => !!(redis && redis.status === "ready") };
