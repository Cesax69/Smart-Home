import { getRedisInstance, getRedisPublisher, getRedisSubscriber } from '../config/redis.config';
import Redis from 'ioredis';

export interface QueueJob {
  id: string;
  type: string;
  data: any;
  createdAt: Date;
  attempts?: number;
  maxAttempts?: number;
}

export class RedisService {
  private redis: Redis;
  private publisher: Redis;
  private subscriber: Redis;

  constructor() {
    this.redis = getRedisInstance();
    this.publisher = getRedisPublisher();
    this.subscriber = getRedisSubscriber();
  }

  // Queue Operations
  async addToQueue(queueName: string, job: QueueJob): Promise<void> {
    try {
      const jobData = JSON.stringify(job);
      await this.redis.lpush(`queue:${queueName}`, jobData);
      console.log(`✅ Job added to ${queueName} queue:`, job.id);
    } catch (error) {
      console.error(`❌ Error adding job to queue ${queueName}:`, error);
      throw error;
    }
  }

  async processQueue(queueName: string): Promise<QueueJob | null> {
    try {
      const result = await this.redis.brpop(`queue:${queueName}`, 1);
      
      if (result && result[1]) {
        const job: QueueJob = JSON.parse(result[1]);
        console.log(`✅ Processing job from ${queueName} queue:`, job.id);
        return job;
      }
      
      return null;
    } catch (error) {
      console.error(`❌ Error processing queue ${queueName}:`, error);
      throw error;
    }
  }

  // Non-blocking pop for faster processing cycles
  async popQueue(queueName: string): Promise<QueueJob | null> {
    try {
      const result = await this.redis.rpop(`queue:${queueName}`);
      if (result) {
        const job: QueueJob = JSON.parse(result);
        console.log(`✅ Popped job from ${queueName} queue:`, job.id);
        return job;
      }
      return null;
    } catch (error) {
      console.error(`❌ Error popping job from queue ${queueName}:`, error);
      return null;
    }
  }

  async getQueueLength(queueName: string): Promise<number> {
    try {
      return await this.redis.llen(`queue:${queueName}`);
    } catch (error) {
      console.error(`❌ Error getting queue length for ${queueName}:`, error);
      return 0;
    }
  }

  // Pub/Sub Operations
  async publish(channel: string, message: any): Promise<void> {
    try {
      const messageData = JSON.stringify(message);
      await this.publisher.publish(channel, messageData);
      console.log(`✅ Message published to channel ${channel}`);
    } catch (error) {
      console.error(`❌ Error publishing to channel ${channel}:`, error);
      throw error;
    }
  }

  async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
    try {
      await this.subscriber.subscribe(channel);
      
      this.subscriber.on('message', (receivedChannel, message) => {
        if (receivedChannel === channel) {
          try {
            const parsedMessage = JSON.parse(message);
            callback(parsedMessage);
          } catch (error) {
            console.error(`❌ Error parsing message from channel ${channel}:`, error);
          }
        }
      });
      
      console.log(`✅ Subscribed to channel ${channel}`);
    } catch (error) {
      console.error(`❌ Error subscribing to channel ${channel}:`, error);
      throw error;
    }
  }

  async subscribePattern(pattern: string, callback: (channel: string, message: any) => void): Promise<void> {
    try {
      await this.subscriber.psubscribe(pattern);
      
      this.subscriber.on('pmessage', (receivedPattern, receivedChannel, message) => {
        if (receivedPattern === pattern) {
          try {
            const parsedMessage = JSON.parse(message);
            callback(receivedChannel, parsedMessage);
          } catch (error) {
            console.error(`❌ Error parsing message from pattern ${pattern}:`, error);
          }
        }
      });
      
      console.log(`✅ Subscribed to pattern ${pattern}`);
    } catch (error) {
      console.error(`❌ Error subscribing to pattern ${pattern}:`, error);
      throw error;
    }
  }
  // Caching Operations
  async setCache(key: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      const valueData = JSON.stringify(value);
      
      if (ttlSeconds) {
        await this.redis.setex(key, ttlSeconds, valueData);
      } else {
        await this.redis.set(key, valueData);
      }
      
      console.log(`✅ Cache set for key: ${key}`);
    } catch (error) {
      console.error(`❌ Error setting cache for key ${key}:`, error);
      throw error;
    }
  }

  async getCache(key: string): Promise<any | null> {
    try {
      const result = await this.redis.get(key);
      
      if (result) {
        return JSON.parse(result);
      }
      
      return null;
    } catch (error) {
      console.error(`❌ Error getting cache for key ${key}:`, error);
      return null;
    }
  }

  async deleteCache(key: string): Promise<void> {
    try {
      await this.redis.del(key);
      console.log(`✅ Cache deleted for key: ${key}`);
    } catch (error) {
      console.error(`❌ Error deleting cache for key ${key}:`, error);
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`❌ Error checking existence for key ${key}:`, error);
      return false;
    }
  }

  // ---------- Hash helpers for single-key collections ----------
  async hashSet(key: string, field: string, value: any): Promise<void> {
    try {
      const valueData = JSON.stringify(value);
      await this.redis.hset(key, field, valueData);
      console.log(`✅ Hash set: ${key}[${field}]`);
    } catch (error) {
      console.error(`❌ Error setting hash ${key}[${field}]:`, error);
      throw error;
    }
  }

  async hashGet<T = any>(key: string, field: string): Promise<T | null> {
    try {
      const raw = await this.redis.hget(key, field);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (error) {
      console.error(`❌ Error getting hash ${key}[${field}]:`, error);
      return null;
    }
  }

  async hashGetAll<T = any>(key: string): Promise<Record<string, T>> {
    try {
      const raw = await this.redis.hgetall(key);
      const result: Record<string, T> = {};
      for (const field in raw) {
        try {
          const fieldValue = raw[field];
          if (fieldValue !== undefined) {
            result[field] = JSON.parse(fieldValue);
          }
        } catch {
          // ignore malformed entries
        }
      }
      return result;
    } catch (error) {
      console.error(`❌ Error getting all hash fields for ${key}:`, error);
      return {} as Record<string, T>;
    }
  }

  async hashDelete(key: string, field: string): Promise<void> {
    try {
      await this.redis.hdel(key, field);
      console.log(`✅ Hash field deleted: ${key}[${field}]`);
    } catch (error) {
      console.error(`❌ Error deleting hash field ${key}[${field}]:`, error);
      throw error;
    }
  }

  async hashLen(key: string): Promise<number> {
    try {
      return await this.redis.hlen(key);
    } catch (error) {
      console.error(`❌ Error getting hash length for ${key}:`, error);
      return 0;
    }
  }


  // Health Check
  async ping(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('❌ Redis ping failed:', error);
      return false;
    }
  }

  // Statistics
  async getStats(): Promise<any> {
    try {
      const info = await this.redis.info();
      return {
        connected: true,
        info: info,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
        console.error('❌ Error getting Redis stats:', error);
        return {
          connected: false,
          error: (error as Error).message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // ===============================
  // Sorted Set Helpers (ZSET)
  // ===============================
  async addToSortedSet(key: string, score: number, member: string): Promise<void> {
    try {
      await this.redis.zadd(key, score, member);
      console.log(`✅ ZADD to ${key}: ${member} @ ${score}`);
    } catch (error) {
      console.error(`❌ Error adding to sorted set ${key}:`, error);
      throw error;
    }
  }

  async getSortedSetRange(key: string, start: number, stop: number, reverse: boolean = true): Promise<string[]> {
    try {
      const members = reverse
        ? await this.redis.zrevrange(key, start, stop)
        : await this.redis.zrange(key, start, stop);
      return members || [];
    } catch (error) {
      console.error(`❌ Error getting range from sorted set ${key}:`, error);
      throw error;
    }
  }

  async removeFromSortedSet(key: string, member: string): Promise<void> {
    try {
      await this.redis.zrem(key, member);
      console.log(`✅ ZREM from ${key}: ${member}`);
    } catch (error) {
      console.error(`❌ Error removing from sorted set ${key}:`, error);
      throw error;
    }
  }

  async getSortedSetCount(key: string): Promise<number> {
    try {
      return await this.redis.zcard(key);
    } catch (error) {
      console.error(`❌ Error getting sorted set count for ${key}:`, error);
      return 0;
    }
  }

  // ===============================
  // List Helpers
  // ===============================
  async addToList(key: string, value: any): Promise<void> {
    try {
      const payload = JSON.stringify(value);
      await this.redis.lpush(key, payload);
      console.log(`✅ LPUSH to ${key}`);
    } catch (error) {
      console.error(`❌ Error adding to list ${key}:`, error);
      throw error;
    }
  }

  async getListRange(key: string, start: number, stop: number): Promise<any[]> {
    try {
      const items = await this.redis.lrange(key, start, stop);
      return (items || []).map((item) => {
        try { return JSON.parse(item); } catch { return item; }
      });
    } catch (error) {
      console.error(`❌ Error getting list range for ${key}:`, error);
      throw error;
    }
  }

  // ===============================
  // Bulk Cache Helpers
  // ===============================
  async getMultipleCache(keys: string[]): Promise<any[]> {
    try {
      if (!keys || keys.length === 0) return [];
      const values = await this.redis.mget(...keys);
      return (values || []).map((val) => {
        if (!val) return null;
        try { return JSON.parse(val); } catch { return val; }
      });
    } catch (error) {
      console.error('❌ Error getting multiple cache keys:', error);
      throw error;
    }
  }
}