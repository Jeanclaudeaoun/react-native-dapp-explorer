import { Connection } from '@solana/web3.js';
import EventEmitter from 'eventemitter3';
import NetInfo from '@react-native-community/netinfo';

interface RPCEndpoint {
  url: string;
  weight: number;
  latency: number;
  lastCheck: number;
  isHealthy: boolean;
}

interface ConnectionConfig {
  endpoints: { [cluster: string]: string[] };
  maxRetries?: number;
  healthCheckInterval?: number;
  loadBalancing?: boolean;
}

export class ConnectionManager extends EventEmitter {
  private connections: Map<string, Connection> = new Map();
  private endpoints: Map<string, RPCEndpoint[]> = new Map();
  private currentCluster: string = 'mainnet-beta';
  private maxRetries: number;
  private healthCheckInterval: number;
  private loadBalancing: boolean;
  private healthCheckTimer?: NodeJS.Timeout;
  private isOnline: boolean = true;

  constructor(config: ConnectionConfig) {
    super();
    this.maxRetries = config.maxRetries || 3;
    this.healthCheckInterval = config.healthCheckInterval || 30000;
    this.loadBalancing = config.loadBalancing || true;

    // Initialize endpoints for each cluster
    Object.entries(config.endpoints).forEach(([cluster, urls]) => {
      this.endpoints.set(cluster, urls.map(url => ({
        url,
        weight: 1,
        latency: 0,
        lastCheck: 0,
        isHealthy: true
      })));
    });

    this.setupNetworkMonitoring();
    this.startHealthChecks();
  }

  private setupNetworkMonitoring() {
    NetInfo.addEventListener(state => {
      const isOnline = state.isConnected ?? false;
      if (this.isOnline !== isOnline) {
        this.isOnline = isOnline;
        this.emit('connectionStateChanged', { isOnline });
        
        if (isOnline) {
          this.refreshConnections();
        }
      }
    });
  }

  private async refreshConnections() {
    // Clear existing connections
    this.connections.clear();
    
    // Perform health checks
    await this.checkEndpointsHealth();
    
    // Recreate connections with healthy endpoints
    this.getHealthyEndpoints(this.currentCluster).forEach(endpoint => {
      const connection = new Connection(endpoint.url, 'confirmed');
      this.connections.set(endpoint.url, connection);
    });

    this.emit('connectionsRefreshed');
  }

  private startHealthChecks() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(
      () => this.checkEndpointsHealth(),
      this.healthCheckInterval
    );
  }

  private async checkEndpointsHealth() {
    for (const [cluster, endpoints] of this.endpoints) {
      for (const endpoint of endpoints) {
        try {
          const start = Date.now();
          const connection = new Connection(endpoint.url);
          await connection.getBlockHeight();
          
          endpoint.latency = Date.now() - start;
          endpoint.isHealthy = true;
          endpoint.lastCheck = Date.now();
          
          // Adjust weight based on latency
          endpoint.weight = Math.max(1, 1000 / endpoint.latency);
        } catch (error) {
          endpoint.isHealthy = false;
          endpoint.weight = 0;
          console.error(`Health check failed for ${endpoint.url}:`, error);
        }
      }
    }

    this.emit('healthCheckComplete');
  }

  private getHealthyEndpoints(cluster: string): RPCEndpoint[] {
    const endpoints = this.endpoints.get(cluster) || [];
    return endpoints.filter(e => e.isHealthy);
  }

  async getConnection(cluster?: string): Promise<Connection> {
    const targetCluster = cluster || this.currentCluster;
    const healthyEndpoints = this.getHealthyEndpoints(targetCluster);

    if (healthyEndpoints.length === 0) {
      throw new Error(`No healthy endpoints available for cluster ${targetCluster}`);
    }

    if (this.loadBalancing) {
      // Select endpoint using weighted round-robin
      const totalWeight = healthyEndpoints.reduce((sum, ep) => sum + ep.weight, 0);
      let random = Math.random() * totalWeight;
      
      for (const endpoint of healthyEndpoints) {
        random -= endpoint.weight;
        if (random <= 0) {
          let connection = this.connections.get(endpoint.url);
          if (!connection) {
            connection = new Connection(endpoint.url, 'confirmed');
            this.connections.set(endpoint.url, connection);
          }
          return connection;
        }
      }
    }

    // Fallback to first healthy endpoint
    const endpoint = healthyEndpoints[0];
    let connection = this.connections.get(endpoint.url);
    if (!connection) {
      connection = new Connection(endpoint.url, 'confirmed');
      this.connections.set(endpoint.url, connection);
    }
    return connection;
  }

  setCluster(cluster: string) {
    if (!this.endpoints.has(cluster)) {
      throw new Error(`Unsupported cluster: ${cluster}`);
    }
    this.currentCluster = cluster;
    this.emit('clusterChanged', { cluster });
  }

  getCluster(): string {
    return this.currentCluster;
  }

  getEndpointStats(cluster?: string): RPCEndpoint[] {
    return [...(this.endpoints.get(cluster || this.currentCluster) || [])];
  }

  async retryWithFailover<T>(
    operation: (connection: Connection) => Promise<T>
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let i = 0; i < this.maxRetries; i++) {
      try {
        const connection = await this.getConnection();
        return await operation(connection);
      } catch (error) {
        lastError = error as Error;
        await this.checkEndpointsHealth();
        continue;
      }
    }

    throw lastError || new Error('Operation failed after retries');
  }

  destroy() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    this.connections.clear();
    this.removeAllListeners();
  }
}
