import EventEmitter from 'eventemitter3';
import { RpcEndpoint, RpcConfig } from '../types/enhanced-types';

export interface ConnectionState {
  isOnline: boolean;
  latency: number;
  currentEndpoint?: RpcEndpoint;
  chainType: 'evm' | 'solana';
}

export interface ConnectionManagerConfig {
  healthCheckIntervalMs?: number;
  maxRetries?: number;
  timeout?: number;
  onDisconnect?: () => void;
  onReconnect?: () => void;
}

export class ConnectionManager extends EventEmitter {
  private states: Map<string, ConnectionState>;
  private healthCheckIntervals: Map<string, NodeJS.Timeout>;
  private config: ConnectionManagerConfig;

  constructor(config: ConnectionManagerConfig = {}) {
    super();
    this.states = new Map();
    this.healthCheckIntervals = new Map();
    this.config = {
      healthCheckIntervalMs: 30000,
      maxRetries: 3,
      timeout: 10000,
      ...config
    };
  }

  async initializeConnection(chainId: string, rpcConfig: RpcConfig): Promise<void> {
    const endpoints = rpcConfig.endpoints[chainId] || [];
    if (endpoints.length === 0) {
      throw new Error(`No endpoints configured for chain ${chainId}`);
    }

    // Initialize state
    this.states.set(chainId, {
      isOnline: false,
      latency: Infinity,
      chainType: this.getChainType(chainId)
    });

    // Start health checks
    await this.startHealthCheck(chainId, endpoints);
  }

  private async startHealthCheck(chainId: string, endpoints: RpcEndpoint[]): Promise<void> {
    const interval = setInterval(async () => {
      const state = this.states.get(chainId);
      if (!state) return;

      let bestEndpoint: RpcEndpoint | undefined;
      let bestLatency = Infinity;

      // Check all endpoints
      for (const endpoint of endpoints) {
        try {
          const startTime = Date.now();
          const isHealthy = await endpoint.healthCheck();
          const latency = Date.now() - startTime;

          if (isHealthy && latency < bestLatency) {
            bestEndpoint = endpoint;
            bestLatency = latency;
          }
        } catch (error) {
          console.warn(`Health check failed for endpoint ${endpoint.url}:`, error);
        }
      }

      // Update state
      const wasOnline = state.isOnline;
      const isOnline = !!bestEndpoint;

      this.states.set(chainId, {
        ...state,
        isOnline,
        latency: bestLatency,
        currentEndpoint: bestEndpoint
      });

      // Emit events
      if (wasOnline && !isOnline) {
        this.emit('disconnect', chainId);
        this.config.onDisconnect?.();
      } else if (!wasOnline && isOnline) {
        this.emit('reconnect', chainId);
        this.config.onReconnect?.();
      }
    }, this.config.healthCheckIntervalMs);

    this.healthCheckIntervals.set(chainId, interval);
  }

  getState(chainId: string): ConnectionState | undefined {
    return this.states.get(chainId);
  }

  private getChainType(chainId: string): 'evm' | 'solana' {
    return chainId.includes('solana') ? 'solana' : 'evm';
  }

  cleanup(): void {
    this.healthCheckIntervals.forEach(interval => clearInterval(interval));
    this.healthCheckIntervals.clear();
    this.states.clear();
  }
}