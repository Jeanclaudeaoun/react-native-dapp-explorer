import { LRUCache } from 'lru-cache';
import EventEmitter from 'eventemitter3';
import { debounce } from 'lodash';

interface CacheConfig {
  maxSize?: number;
  ttl?: number;
}

interface RequestBatch {
  requests: any[];
  resolve: (value: any) => void;
  reject: (error: Error) => void;
}

export class PerformanceManager extends EventEmitter {
  private cache: LRUCache<string, any>;
  private requestBatches: Map<string, RequestBatch[]> = new Map();
  private batchTimeout = 50; // ms
  private resourceUsage: Map<string, number> = new Map();
  private maxConcurrentRequests = 5;
  private activeRequests = 0;

  constructor(config: CacheConfig = {}) {
    super();
    this.cache = new LRUCache({
      max: config.maxSize || 100,
      ttl: config.ttl || 1000 * 60, // 1 minute default TTL
      updateAgeOnGet: true
    });

    // Setup batched request processing
    this.processBatchedRequests = debounce(
      this.processBatchedRequests.bind(this),
      this.batchTimeout
    );
  }

  async request<T>(
    key: string,
    operation: () => Promise<T>,
    options: {
      bypassCache?: boolean;
      batch?: boolean;
      priority?: number;
    } = {}
  ): Promise<T> {
    const { bypassCache = false, batch = false, priority = 1 } = options;

    // Check cache first if not bypassing
    if (!bypassCache) {
      const cached = this.cache.get(key);
      if (cached !== undefined) {
        return cached;
      }
    }

    // Handle batched requests
    if (batch) {
      return this.batchRequest(key, operation);
    }

    // Rate limiting and resource management
    await this.acquireRequestSlot(priority);

    try {
      const result = await operation();
      
      // Cache the result
      if (!bypassCache) {
        this.cache.set(key, result);
      }

      // Track resource usage
      this.updateResourceUsage(key);

      return result;
    } finally {
      this.releaseRequestSlot();
    }
  }

  private async batchRequest<T>(
    key: string,
    operation: () => Promise<T>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const batch = this.requestBatches.get(key) || [];
      batch.push({
        requests: [operation],
        resolve,
        reject
      });
      this.requestBatches.set(key, batch);
      this.processBatchedRequests();
    });
  }

  private async processBatchedRequests(): Promise<void> {
    for (const [key, batches] of this.requestBatches.entries()) {
      if (batches.length === 0) continue;

      try {
        // Combine all requests in the batch
        const operations = batches.flatMap(batch => batch.requests);
        
        // Execute all operations
        const results = await Promise.all(operations.map(op => op()));
        
        // Resolve all promises in the batch
        batches.forEach((batch, index) => {
          batch.resolve(results[index]);
        });
      } catch (error) {
        // Reject all promises in the batch
        batches.forEach(batch => {
          batch.reject(error as Error);
        });
      }

      // Clear the processed batch
      this.requestBatches.delete(key);
    }
  }

  private async acquireRequestSlot(priority: number): Promise<void> {
    while (this.activeRequests >= this.maxConcurrentRequests) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    this.activeRequests++;
  }

  private releaseRequestSlot(): void {
    this.activeRequests--;
  }

  private updateResourceUsage(key: string): void {
    const currentUsage = this.resourceUsage.get(key) || 0;
    this.resourceUsage.set(key, currentUsage + 1);

    // Emit warning if resource usage is high
    if (currentUsage > 100) {
      this.emit('highResourceUsage', { key, usage: currentUsage });
    }
  }

  clearCache(): void {
    this.cache.clear();
  }

  invalidateCache(key: string): void {
    this.cache.delete(key);
  }

  getResourceUsage(): Map<string, number> {
    return new Map(this.resourceUsage);
  }

  getActiveRequestCount(): number {
    return this.activeRequests;
  }

  setMaxConcurrentRequests(max: number): void {
    this.maxConcurrentRequests = max;
  }

  setBatchTimeout(timeout: number): void {
    this.batchTimeout = timeout;
    // Update debounced function with new timeout
    this.processBatchedRequests = debounce(
      this.processBatchedRequests.bind(this),
      this.batchTimeout
    );
  }
}
