/**
 * Response Storage System for RestifiedTS
 * 
 * This module provides response caching and storage functionality
 * for HTTP responses in RestifiedTS with TTL support and memory management.
 */

import { RestifiedResponse, ResponseStorage } from '../../types/RestifiedTypes';

/**
 * Response storage manager for caching HTTP responses
 */
export class ResponseStore {
  private storage: Map<string, ResponseStorage> = new Map();
  private maxSize: number;
  private defaultTtl: number;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(options: {
    maxSize?: number;
    defaultTtl?: number;
    enableCleanup?: boolean;
    cleanupIntervalMs?: number;
  } = {}) {
    this.maxSize = options.maxSize || 100;
    this.defaultTtl = options.defaultTtl || 300000; // 5 minutes default
    
    if (options.enableCleanup !== false) {
      this.startCleanupInterval(options.cleanupIntervalMs || 60000); // 1 minute cleanup
    }
  }

  /**
   * Store a response with the given key
   */
  store(key: string, response: RestifiedResponse, ttl?: number): void {
    // Check if we need to make space
    if (this.storage.size >= this.maxSize) {
      this.evictOldest();
    }

    const expirationTime = ttl || this.defaultTtl;
    const storageItem: ResponseStorage = {
      key,
      response: this.cloneResponse(response),
      timestamp: new Date(),
      ttl: expirationTime
    };

    this.storage.set(key, storageItem);
  }

  /**
   * Retrieve a response by key
   */
  get(key: string): RestifiedResponse | null {
    const item = this.storage.get(key);
    
    if (!item) {
      return null;
    }

    // Check if item has expired
    if (this.isExpired(item)) {
      this.storage.delete(key);
      return null;
    }

    return this.cloneResponse(item.response);
  }

  /**
   * Check if a response exists for the given key
   */
  has(key: string): boolean {
    const item = this.storage.get(key);
    
    if (!item) {
      return false;
    }

    // Check if item has expired
    if (this.isExpired(item)) {
      this.storage.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Remove a response by key
   */
  remove(key: string): boolean {
    return this.storage.delete(key);
  }

  /**
   * Clear all stored responses
   */
  clear(): void {
    this.storage.clear();
  }

  /**
   * Get all stored response keys
   */
  keys(): string[] {
    this.cleanupExpired();
    return Array.from(this.storage.keys());
  }

  /**
   * Get storage statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    oldestEntry?: Date;
    newestEntry?: Date;
    memoryUsage: number;
  } {
    this.cleanupExpired();
    
    let oldestEntry: Date | undefined;
    let newestEntry: Date | undefined;
    let memoryUsage = 0;

    this.storage.forEach(item => {
      const timestamp = item.timestamp;
      
      if (!oldestEntry || timestamp < oldestEntry) {
        oldestEntry = timestamp;
      }
      
      if (!newestEntry || timestamp > newestEntry) {
        newestEntry = timestamp;
      }

      // Estimate memory usage (rough calculation)
      memoryUsage += this.estimateResponseSize(item.response);
    });

    return {
      size: this.storage.size,
      maxSize: this.maxSize,
      oldestEntry,
      newestEntry,
      memoryUsage
    };
  }

  /**
   * Get responses by pattern matching
   */
  find(predicate: (key: string, response: RestifiedResponse) => boolean): Array<{ key: string; response: RestifiedResponse }> {
    this.cleanupExpired();
    const results: Array<{ key: string; response: RestifiedResponse }> = [];

    this.storage.forEach((item, key) => {
      if (predicate(key, item.response)) {
        results.push({
          key,
          response: this.cloneResponse(item.response)
        });
      }
    });

    return results;
  }

  /**
   * Get responses by status code
   */
  findByStatus(statusCode: number): Array<{ key: string; response: RestifiedResponse }> {
    return this.find((key, response) => response.status === statusCode);
  }

  /**
   * Get responses by URL pattern
   */
  findByUrl(urlPattern: string | RegExp): Array<{ key: string; response: RestifiedResponse }> {
    const pattern = typeof urlPattern === 'string' 
      ? new RegExp(urlPattern) 
      : urlPattern;
    
    return this.find((key, response) => pattern.test(response.request.url));
  }

  /**
   * Get responses within time range
   */
  findByTimeRange(startTime: Date, endTime: Date): Array<{ key: string; response: RestifiedResponse }> {
    return this.find((key, response) => {
      const responseTime = response.timestamp;
      return responseTime >= startTime && responseTime <= endTime;
    });
  }

  /**
   * Update TTL for a stored response
   */
  updateTtl(key: string, newTtl: number): boolean {
    const item = this.storage.get(key);
    if (!item) {
      return false;
    }

    item.ttl = newTtl;
    return true;
  }

  /**
   * Get time until expiration for a stored response
   */
  getTimeToExpiration(key: string): number | null {
    const item = this.storage.get(key);
    if (!item) {
      return null;
    }

    const expirationTime = item.timestamp.getTime() + (item.ttl || this.defaultTtl);
    const timeLeft = expirationTime - Date.now();
    
    return Math.max(0, timeLeft);
  }

  /**
   * Export stored responses
   */
  export(): Array<{ key: string; response: RestifiedResponse; metadata: { timestamp: Date; ttl: number } }> {
    this.cleanupExpired();
    const exported: Array<{ key: string; response: RestifiedResponse; metadata: { timestamp: Date; ttl: number } }> = [];

    this.storage.forEach((item, key) => {
      exported.push({
        key,
        response: this.cloneResponse(item.response),
        metadata: {
          timestamp: item.timestamp,
          ttl: item.ttl || this.defaultTtl
        }
      });
    });

    return exported;
  }

  /**
   * Import responses from export data
   */
  import(data: Array<{ key: string; response: RestifiedResponse; metadata: { timestamp: Date; ttl: number } }>): void {
    data.forEach(item => {
      const storageItem: ResponseStorage = {
        key: item.key,
        response: this.cloneResponse(item.response),
        timestamp: new Date(item.metadata.timestamp),
        ttl: item.metadata.ttl
      };

      // Only import if not expired
      if (!this.isExpired(storageItem)) {
        this.storage.set(item.key, storageItem);
      }
    });
  }

  /**
   * Resize the storage capacity
   */
  resize(newMaxSize: number): void {
    this.maxSize = newMaxSize;
    
    // Evict items if we're over the new limit
    while (this.storage.size > this.maxSize) {
      this.evictOldest();
    }
  }

  /**
   * Cleanup and destroy the store
   */
  destroy(): void {
    this.clear();
    this.stopCleanupInterval();
  }

  /**
   * Check if a storage item has expired
   */
  private isExpired(item: ResponseStorage): boolean {
    const expirationTime = item.timestamp.getTime() + (item.ttl || this.defaultTtl);
    return Date.now() > expirationTime;
  }

  /**
   * Remove expired items
   */
  private cleanupExpired(): void {
    const expiredKeys: string[] = [];
    
    this.storage.forEach((item, key) => {
      if (this.isExpired(item)) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => {
      this.storage.delete(key);
    });
  }

  /**
   * Evict the oldest item to make space
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime: number = Date.now();

    this.storage.forEach((item, key) => {
      if (item.timestamp.getTime() < oldestTime) {
        oldestTime = item.timestamp.getTime();
        oldestKey = key;
      }
    });

    if (oldestKey) {
      this.storage.delete(oldestKey);
    }
  }

  /**
   * Create a deep clone of a response object
   */
  private cloneResponse(response: RestifiedResponse): RestifiedResponse {
    return {
      ...response,
      data: this.deepClone(response.data),
      headers: { ...response.headers },
      request: { ...response.request },
      config: { ...response.config }
    };
  }

  /**
   * Deep clone an object
   */
  private deepClone(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.deepClone(item));
    }

    const cloned: any = {};
    Object.keys(obj).forEach(key => {
      cloned[key] = this.deepClone(obj[key]);
    });

    return cloned;
  }

  /**
   * Estimate memory usage of a response (rough calculation)
   */
  private estimateResponseSize(response: RestifiedResponse): number {
    try {
      return JSON.stringify(response).length * 2; // Rough estimate (UTF-16)
    } catch {
      return 1024; // Default estimate if serialization fails
    }
  }

  /**
   * Start periodic cleanup of expired items
   */
  private startCleanupInterval(intervalMs: number): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, intervalMs);
  }

  /**
   * Stop the cleanup interval
   */
  private stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }
}

export default ResponseStore;