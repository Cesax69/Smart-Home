import Redis from 'ioredis';

export interface RedisConfig {
  host: string;
  port: number;
  password: string;
  db: number;
  retryDelayOnFailover: number;
  maxRetriesPerRequest: number;
}

export const redisConfig: RedisConfig = {
  host: process.env.REDIS_HOST || 'redis-notifications',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || 'smartHomeRedis2024',
  db: 0,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
};

// Redis instances for different purposes
let redisInstance: Redis | null = null;
let redisPublisher: Redis | null = null;
let redisSubscriber: Redis | null = null;

export const getRedisInstance = (): Redis => {
  if (!redisInstance) {
    redisInstance = new Redis(redisConfig);
    
    redisInstance.on('connect', () => {
      console.log('✅ Redis instance connected successfully');
    });
    
    redisInstance.on('error', (error) => {
      console.error('❌ Redis instance connection error:', error);
    });
  }
  
  return redisInstance;
};

export const getRedisPublisher = (): Redis => {
  if (!redisPublisher) {
    redisPublisher = new Redis(redisConfig);
    
    redisPublisher.on('connect', () => {
      console.log('✅ Redis publisher connected successfully');
    });
    
    redisPublisher.on('error', (error) => {
      console.error('❌ Redis publisher connection error:', error);
    });
  }
  
  return redisPublisher;
};

export const getRedisSubscriber = (): Redis => {
  if (!redisSubscriber) {
    redisSubscriber = new Redis(redisConfig);
    
    redisSubscriber.on('connect', () => {
      console.log('✅ Redis subscriber connected successfully');
    });
    
    redisSubscriber.on('error', (error) => {
      console.error('❌ Redis subscriber connection error:', error);
    });
  }
  
  return redisSubscriber;
};

export const closeRedisConnections = async (): Promise<void> => {
  const promises: Promise<void>[] = [];
  
  if (redisInstance) {
    promises.push(redisInstance.quit().then(() => {}));
    redisInstance = null;
  }
  
  if (redisPublisher) {
    promises.push(redisPublisher.quit().then(() => {}));
    redisPublisher = null;
  }
  
  if (redisSubscriber) {
    promises.push(redisSubscriber.quit().then(() => {}));
    redisSubscriber = null;
  }
  
  await Promise.all(promises);
  console.log('✅ All Redis connections closed');
};