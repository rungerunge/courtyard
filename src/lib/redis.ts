/**
 * Redis Client with In-Memory Fallback
 * 
 * Used for:
 * - Distributed locks during pack assignment
 * - Caching pack health calculations
 * - Rate limiting
 * 
 * Falls back to in-memory implementation for local development
 */

// In-memory storage for development without Redis
const memoryStore = new Map<string, { value: string; expiresAt: number | null }>();
const memoryLocks = new Map<string, string>();

// Check if we should use real Redis
const useRealRedis = !!process.env.REDIS_URL && process.env.REDIS_URL !== "redis://localhost:6379";

let redisClient: import("ioredis").default | null = null;

async function getRedisClient() {
  if (!useRealRedis) return null;
  
  if (!redisClient) {
    const Redis = (await import("ioredis")).default;
    redisClient = new Redis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      connectTimeout: 10000,
      lazyConnect: true,
    });
  }
  return redisClient;
}

/**
 * In-memory lock implementation for local development
 */
class InMemoryLock {
  private key: string;
  private value: string;
  
  constructor(key: string) {
    this.key = `lock:${key}`;
    this.value = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
  
  acquire(): boolean {
    if (memoryLocks.has(this.key)) {
      return false;
    }
    memoryLocks.set(this.key, this.value);
    // Auto-expire after 30 seconds
    setTimeout(() => {
      if (memoryLocks.get(this.key) === this.value) {
        memoryLocks.delete(this.key);
      }
    }, 30000);
    return true;
  }
  
  release(): boolean {
    if (memoryLocks.get(this.key) === this.value) {
      memoryLocks.delete(this.key);
      return true;
    }
    return false;
  }
}

/**
 * Distributed Lock for Pack Assignment
 */
export class DistributedLock {
  private lockKey: string;
  private lockValue: string;
  private ttlSeconds: number;
  
  constructor(key: string, ttlSeconds = 30) {
    this.lockKey = `lock:${key}`;
    this.lockValue = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this.ttlSeconds = ttlSeconds;
  }
  
  async acquire(): Promise<boolean> {
    const client = await getRedisClient();
    
    if (!client) {
      // Use in-memory lock
      if (memoryLocks.has(this.lockKey)) {
        return false;
      }
      memoryLocks.set(this.lockKey, this.lockValue);
      setTimeout(() => {
        if (memoryLocks.get(this.lockKey) === this.lockValue) {
          memoryLocks.delete(this.lockKey);
        }
      }, this.ttlSeconds * 1000);
      return true;
    }
    
    const result = await client.set(
      this.lockKey,
      this.lockValue,
      "EX",
      this.ttlSeconds,
      "NX"
    );
    return result === "OK";
  }
  
  async release(): Promise<boolean> {
    const client = await getRedisClient();
    
    if (!client) {
      if (memoryLocks.get(this.lockKey) === this.lockValue) {
        memoryLocks.delete(this.lockKey);
        return true;
      }
      return false;
    }
    
    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    
    const result = await client.eval(luaScript, 1, this.lockKey, this.lockValue);
    return result === 1;
  }
}

/**
 * Execute a function with a distributed lock
 */
export async function withLock<T>(
  key: string,
  fn: () => Promise<T>,
  options: { ttlSeconds?: number; maxRetries?: number; retryDelayMs?: number } = {}
): Promise<T> {
  const { ttlSeconds = 30, maxRetries = 5, retryDelayMs = 100 } = options;
  
  const lock = new DistributedLock(key, ttlSeconds);
  let retries = 0;
  
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
  const client = await getRedisClient();
  
  if (!client) {
    const entry = memoryStore.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      memoryStore.delete(key);
      return null;
    }
    try {
      return JSON.parse(entry.value) as T;
    } catch {
      return null;
    }
  }
  
  const value = await client.get(key);
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
  const client = await getRedisClient();
  
  if (!client) {
    memoryStore.set(key, {
      value: JSON.stringify(value),
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
    return;
  }
  
  await client.set(key, JSON.stringify(value), "EX", ttlSeconds);
}

export async function cacheDelete(key: string): Promise<void> {
  const client = await getRedisClient();
  
  if (!client) {
    memoryStore.delete(key);
    return;
  }
  
  await client.del(key);
}

// Export a mock redis object for compatibility
export const redis = {
  get: async (key: string) => {
    const client = await getRedisClient();
    if (!client) {
      const entry = memoryStore.get(key);
      if (!entry) return null;
      if (entry.expiresAt && entry.expiresAt < Date.now()) {
        memoryStore.delete(key);
        return null;
      }
      return entry.value;
    }
    return client.get(key);
  },
  set: async (key: string, value: string, ...args: unknown[]) => {
    const client = await getRedisClient();
    if (!client) {
      let ttl: number | null = null;
      if (args[0] === "EX" && typeof args[1] === "number") {
        ttl = args[1] * 1000;
      }
      memoryStore.set(key, {
        value,
        expiresAt: ttl ? Date.now() + ttl : null,
      });
      return "OK";
    }
    return client.set(key, value, ...(args as [string, number]));
  },
  del: async (key: string) => {
    const client = await getRedisClient();
    if (!client) {
      memoryStore.delete(key);
      return 1;
    }
    return client.del(key);
  },
};

export default redis;
