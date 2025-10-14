import { getRedisInstance, getRedisPublisher, getRedisSubscriber } from '../config/redis.config';
import Redis from 'ioredis';

export interface QueueJob {
  id: string;
  type: string;
  data: any;
  priority: 'high' | 'low';
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
      
      if (job.priority === 'high') {
        await this.redis.lpush(`queue:${queueName}:high`, jobData);
      } else {
        await this.redis.lpush(`queue:${queueName}:low`, jobData);
      }
      
      console.log(`✅ Job added to ${queueName} queue with ${job.priority} priority:`, job.id);
    } catch (error) {
      console.error(`❌ Error adding job to queue ${queueName}:`, error);
      throw error;
    }
  }

  async processQueue(queueName: string, priority: 'high' | 'low' = 'high'): Promise<QueueJob | null> {
    try {
      const result = await this.redis.brpop(`queue:${queueName}:${priority}`, 1);
      
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

  async getQueueLength(queueName: string, priority: 'high' | 'low' = 'high'): Promise<number> {
    try {
      return await this.redis.llen(`queue:${queueName}:${priority}`);
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
}