import { AnalyticsEvent, ChainType, TransactionMetadata } from './types/enhanced-types';

interface AnalyticsConfig {
  enabled: boolean;
  batchSize?: number;
  flushIntervalMs?: number;
  onEvent?: (event: AnalyticsEvent) => void;
}

export class AnalyticsManager {
  private enabled: boolean;
  private eventQueue: AnalyticsEvent[];
  private batchSize: number;
  private flushInterval?: NodeJS.Timeout;
  private onEvent?: (event: AnalyticsEvent) => void;

  constructor(config: AnalyticsConfig) {
    this.enabled = config.enabled;
    this.eventQueue = [];
    this.batchSize = config.batchSize || 10;
    this.onEvent = config.onEvent;

    if (this.enabled && config.flushIntervalMs) {
      this.flushInterval = setInterval(() => {
        this.flush();
      }, config.flushIntervalMs);
    }
  }

  trackEvent(type: AnalyticsEvent['type'], chainType: ChainType, data: Record<string, any>): void {
    if (!this.enabled) return;

    const event: AnalyticsEvent = {
      type,
      chainType,
      timestamp: Date.now(),
      data
    };

    this.eventQueue.push(event);
    this.onEvent?.(event);

    if (this.eventQueue.length >= this.batchSize) {
      this.flush();
    }
  }

  trackTransaction(metadata: TransactionMetadata): void {
    this.trackEvent('transaction', metadata.chain, {
      hash: metadata.hash,
      timestamp: metadata.timestamp,
      status: metadata.status,
      domain: metadata.domain
    });
  }

  trackError(chainType: ChainType, error: Error, context?: Record<string, any>): void {
    this.trackEvent('error', chainType, {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...context
    });
  }

  private flush(): void {
    if (this.eventQueue.length === 0) return;

    // Here you would typically send the events to your analytics service
    // For now, we just log them if there's no custom handler
    if (!this.onEvent) {
      console.debug('Analytics events:', this.eventQueue);
    }

    this.eventQueue = [];
  }

  cleanup(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flush();
  }
}
