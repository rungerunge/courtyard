import Redis from "ioredis";

/**
 * Redis Client Singleton
 * 
 * Used for:
 * - Distributed locks during pack assignment
 * - Caching pack health calculations
 * - Rate limiting
 */

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedisClient(): Redis {
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    console.warn("REDIS_URL not configured, using mock Redis");
    // Return a mock for development without Redis
    return new Redis({
      host: "localhost",
      port: 6379,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
  }
  
  return new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    retryDelayOnClusterDown: 100,
    enableReadyCheck: true,
    connectTimeout: 10000,
  });
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

/**
 * Distributed Lock for Pack Assignment
 * 
 * Prevents race conditions when multiple users try to open
 * the same pack simultaneously
 */
export class DistributedLock {
  private redis: Redis;
  private lockKey: string;
  private lockValue: string;
  private ttlSeconds: number;
  
  constructor(redis: Redis, key: string, ttlSeconds = 30) {
    this.redis = redis;
    this.lockKey = `lock:${key}`;
    this.lockValue = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this.ttlSeconds = ttlSeconds;
  }
  
  /**
   * Attempt to acquire the lock
   * @returns true if lock acquired, false otherwise
   */
  async acquire(): Promise<boolean> {
    const result = await this.redis.set(
      this.lockKey,
      this.lockValue,
      "EX",
      this.ttlSeconds,
      "NX"
    );
    return result === "OK";
  }
  
  /**
   * Release the lock (only if we own it)
   */
  async release(): Promise<boolean> {
    // Use Lua script to atomically check and delete
    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    
    const result = await this.redis.eval(luaScript, 1, this.lockKey, this.lockValue);
    return result === 1;
  }
  
  /**
   * Extend the lock TTL (if we own it)
   */
  async extend(additionalSeconds: number): Promise<boolean> {
    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("expire", KEYS[1], ARGV[2])
      else
        return 0
      end
    `;
    
    const result = await this.redis.eval(
      luaScript,
      1,
      this.lockKey,
      this.lockValue,
      additionalSeconds
    );
    return result === 1;
  }
}

/**
 * Execute a function with a distributed lock
 * 
 * @param key - Lock key identifier
 * @param fn - Function to execute while holding the lock
 * @param options - Lock options
 */
export async function withLock<T>(
  key: string,
  fn: () => Promise<T>,
  options: { ttlSeconds?: number; maxRetries?: number; retryDelayMs?: number } = {}
): Promise<T> {
  const { ttlSeconds = 30, maxRetries = 5, retryDelayMs = 100 } = options;
  
  const lock = new DistributedLock(redis, key, ttlSeconds);
  let retries = 0;
  
  // Try to acquire lock with retries
  while (retries < maxRetries) {
    const acquired = await lock.acquire();
    
    if (acquired) {
      try {
        return await fn();
      } finally {
        await lock.release();
      }
    }
    
    retries++;
    if (retries < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs * retries));
    }
  }
  
  throw new Error(`Failed to acquire lock for key: ${key} after ${maxRetries} retries`);
}

/**
 * Cache helper with TTL
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const value = await redis.get(key);
  if (!value) return null;
  
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
}

export async function cacheDelete(key: string): Promise<void> {
  await redis.del(key);
}

export default redis;

