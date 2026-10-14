import Redis from "ioredis";

const buckets = new Map<string, { count: number; reset: number }>();
let redis: Redis | null = null;

function memoryAllow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

export async function allowRequest(key: string, limit = 60, windowMs = 60_000): Promise<boolean> {
  if (process.env.REDIS_URL) {
    try {
      if (!redis) redis = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1, enableOfflineQueue: false });
      const hits = await redis.incr(`rl:${key}`);
      if (hits === 1) await redis.pexpire(`rl:${key}`, windowMs);
      return hits <= limit;
    } catch {
      redis?.disconnect();
      redis = null;
    }
  }
  return memoryAllow(key, limit, windowMs);
}
