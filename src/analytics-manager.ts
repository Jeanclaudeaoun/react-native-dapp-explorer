import EventEmitter from 'eventemitter3';

interface AnalyticsEvent {
  type: string;
  timestamp: number;
  data: any;
}

interface DAppMetrics {
  loadTime: number;
  transactionCount: number;
  errorCount: number;
  lastInteraction: number;
}

export class AnalyticsManager extends EventEmitter {
  private events: AnalyticsEvent[] = [];
  private dappMetrics: Map<string, DAppMetrics> = new Map();
  private sessionStartTime: number;
  private readonly MAX_EVENTS = 1000;

  constructor() {
    super();
    this.sessionStartTime = Date.now();
  }

  trackEvent(type: string, data: any): void {
    const event: AnalyticsEvent = {
      type,
      timestamp: Date.now(),
      data,
    };

    this.events.push(event);
    if (this.events.length > this.MAX_EVENTS) {
      this.events.shift();
    }

    this.emit('newEvent', event);
    this.updateMetrics(event);
  }

  private updateMetrics(event: AnalyticsEvent): void {
    const domain = event.data.domain || event.data.origin;
    if (!domain) return;

    const metrics = this.dappMetrics.get(domain) || {
      loadTime: 0,
      transactionCount: 0,
      errorCount: 0,
      lastInteraction: Date.now(),
    };

    switch (event.type) {
      case 'pageLoad':
        metrics.loadTime = event.data.duration;
        break;
      case 'transaction':
        metrics.transactionCount++;
        break;
      case 'error':
        metrics.errorCount++;
        break;
    }

    metrics.lastInteraction = Date.now();
    this.dappMetrics.set(domain, metrics);
  }

  getDAppMetrics(domain: string): DAppMetrics | undefined {
    return this.dappMetrics.get(domain);
  }

  getAllDAppMetrics(): Map<string, DAppMetrics> {
    return new Map(this.dappMetrics);
  }

  getSessionDuration(): number {
    return Date.now() - this.sessionStartTime;
  }

  getRecentEvents(count: number = 10): AnalyticsEvent[] {
    return this.events.slice(-count);
  }

  getEventsByType(type: string): AnalyticsEvent[] {
    return this.events.filter(event => event.type === type);
  }

  getErrorRate(): number {
    const totalEvents = this.events.length;
    const errorEvents = this.events.filter(e => e.type === 'error').length;
    return totalEvents > 0 ? errorEvents / totalEvents : 0;
  }

  generateReport(): {
    sessionDuration: number;
    totalEvents: number;
    errorRate: number;
    dappMetrics: Map<string, DAppMetrics>;
    recentEvents: AnalyticsEvent[];
  } {
    return {
      sessionDuration: this.getSessionDuration(),
      totalEvents: this.events.length,
      errorRate: this.getErrorRate(),
      dappMetrics: this.getAllDAppMetrics(),
      recentEvents: this.getRecentEvents(),
    };
  }

  clear(): void {
    this.events = [];
    this.dappMetrics.clear();
    this.emit('cleared');
  }
}
