import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis | null = null;
  private readonly logger = new Logger(RedisService.name);
  private isConnected = false;

  async onModuleInit() {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      this.logger.warn("REDIS_URL not set - Redis caching disabled, using in-memory fallback");
      return;
    }

    try {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        connectTimeout: 5000,
        lazyConnect: true,
      });

      await this.client.connect();
      this.isConnected = true;
      this.logger.log("Redis connected successfully");

      this.client.on("error", (err) => {
        this.logger.error("Redis connection error:", err.message);
        this.isConnected = false;
      });

      this.client.on("reconnecting", () => {
        this.logger.log("Redis reconnecting...");
      });

      this.client.on("ready", () => {
        this.isConnected = true;
        this.logger.log("Redis ready");
      });
    } catch (error) {
      this.logger.error("Failed to connect to Redis:", error);
      this.client = null;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      this.logger.log("Redis disconnected");
    }
  }

  /**
   * Check if Redis is available
   */
  isAvailable(): boolean {
    return this.isConnected && this.client !== null;
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isAvailable()) return null;

    try {
      const value = await this.client!.get(key);
      if (value) {
        return JSON.parse(value) as T;
      }
      return null;
    } catch (error) {
      this.logger.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a value in cache with TTL (in seconds)
   */
  async set(key: string, value: unknown, ttlSeconds: number): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      await this.client!.setex(key, ttlSeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      this.logger.error(`Redis SET error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete a key from cache
   */
  async del(key: string): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      await this.client!.del(key);
      return true;
    } catch (error) {
      this.logger.error(`Redis DEL error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete all keys matching a pattern
   */
  async delPattern(pattern: string): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      const keys = await this.client!.keys(pattern);
      if (keys.length > 0) {
        await this.client!.del(...keys);
      }
      return true;
    } catch (error) {
      this.logger.error(`Redis DEL pattern error for ${pattern}:`, error);
      return false;
    }
  }

  /**
   * Clear all discovery-related cache
   */
  async clearDiscoveryCache(): Promise<boolean> {
    return this.delPattern("discovery:*");
  }

  /**
   * Clear all service-types cache
   */
  async clearServiceTypesCache(): Promise<boolean> {
    return this.delPattern("service-types:*");
  }
}
