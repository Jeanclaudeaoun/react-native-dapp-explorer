import { ConnectionManager } from './connection-manager';
import { PerformanceManager } from './performance-manager';
import { AnalyticsManager } from './analytics-manager';
import { StateManager } from './state-manager';
import EventEmitter from 'eventemitter3';

interface DAppManagerConfig {
  endpoints: { [cluster: string]: string[] };
  maxConcurrentRequests?: number;
  cacheSize?: number;
  cacheTTL?: number;
  healthCheckInterval?: number;
}

export class DAppManager extends EventEmitter {
  private connectionManager: ConnectionManager;
  private performanceManager: PerformanceManager;
  private analyticsManager: AnalyticsManager;
  private stateManager: StateManager;

  constructor(config: DAppManagerConfig) {
    super();

    // Initialize all managers
    this.connectionManager = new ConnectionManager({
      endpoints: config.endpoints,
      healthCheckInterval: config.healthCheckInterval
    });

    this.performanceManager = new PerformanceManager({
      maxSize: config.cacheSize,
      ttl: config.cacheTTL
    });

    this.analyticsManager = new AnalyticsManager();
    this.stateManager = new StateManager();

    // Set up event listeners
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Connection state changes
    this.connectionManager.on('connectionStateChanged', ({ isOnline }) => {
      this.analyticsManager.trackEvent('connectionState', { isOnline });
      this.emit('connectionStateChanged', { isOnline });
    });

    // Performance monitoring
    this.performanceManager.on('highResourceUsage', (data) => {
      this.analyticsManager.trackEvent('highResourceUsage', data);
      this.emit('performanceWarning', data);
    });

    // State changes
    this.stateManager.on('stateCleared', () => {
      this.performanceManager.clearCache();
      this.analyticsManager.trackEvent('stateCleared', {});
    });
  }

  async executeRequest<T>(
    key: string,
    operation: () => Promise<T>,
    options: {
      bypassCache?: boolean;
      batch?: boolean;
      priority?: number;
      retry?: boolean;
    } = {}
  ): Promise<T> {
    const startTime = Date.now();

    try {
      let result: T;
      
      if (options.retry) {
        result = await this.connectionManager.retryWithFailover(async () => {
          return this.performanceManager.request(key, operation, options);
        });
      } else {
        result = await this.performanceManager.request(key, operation, options);
      }

      // Track successful request
      this.analyticsManager.trackEvent('request', {
        key,
        duration: Date.now() - startTime,
        success: true
      });

      return result;
    } catch (error) {
      // Track failed request
      this.analyticsManager.trackEvent('request', {
        key,
        duration: Date.now() - startTime,
        success: false,
        error: error.message
      });

      throw error;
    }
  }

  async changeSolanaCluster(cluster: string): Promise<void> {
    await this.connectionManager.setCluster(cluster);
    this.performanceManager.clearCache();
    await this.stateManager.updateSettings({ defaultCluster: cluster });
    
    this.analyticsManager.trackEvent('clusterChanged', { cluster });
    this.emit('clusterChanged', { cluster });
  }

  async addTrustedDomain(domain: string): Promise<void> {
    await this.stateManager.addTrustedDomain(domain);
    this.analyticsManager.trackEvent('trustedDomainAdded', { domain });
  }

  getAnalyticsReport() {
    return this.analyticsManager.generateReport();
  }

  getResourceUsage() {
    return {
      performance: this.performanceManager.getResourceUsage(),
      activeRequests: this.performanceManager.getActiveRequestCount(),
      endpoints: this.connectionManager.getEndpointStats()
    };
  }

  clearState(): void {
    this.stateManager.clearAll();
    this.performanceManager.clearCache();
    this.analyticsManager.clear();
    this.emit('stateCleared');
  }

  destroy(): void {
    this.connectionManager.destroy();
    this.removeAllListeners();
  }
}
