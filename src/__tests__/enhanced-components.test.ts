import { DAppManager } from '../dapp-manager';
import { ConnectionManager } from '../connection-manager';
import { PerformanceManager } from '../performance-manager';
import { AnalyticsManager } from '../analytics-manager';
import { StateManager } from '../state-manager';

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn()
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn()
}));

describe('Enhanced DApp Browser Components', () => {
  const mockEndpoints = {
    'mainnet-beta': [
      'https://api.mainnet-beta.solana.com',
      'https://solana-api.projectserum.com'
    ],
    'testnet': ['https://api.testnet.solana.com'],
    'devnet': ['https://api.devnet.solana.com']
  };

  let dappManager: DAppManager;

  beforeEach(() => {
    dappManager = new DAppManager({
      endpoints: mockEndpoints,
      maxConcurrentRequests: 5,
      cacheSize: 100,
      cacheTTL: 1000,
      healthCheckInterval: 1000
    });
  });

  afterEach(() => {
    dappManager.destroy();
    jest.clearAllMocks();
  });

  describe('DAppManager', () => {
    it('should execute requests with performance optimization', async () => {
      const mockOperation = jest.fn().mockResolvedValue('result');
      
      const result = await dappManager.executeRequest(
        'test-key',
        mockOperation,
        { retry: true }
      );

      expect(result).toBe('result');
      expect(mockOperation).toHaveBeenCalled();
    });

    it('should handle cluster changes', async () => {
      const clusterChangedHandler = jest.fn();
      dappManager.on('clusterChanged', clusterChangedHandler);

      await dappManager.changeSolanaCluster('testnet');

      expect(clusterChangedHandler).toHaveBeenCalledWith({ cluster: 'testnet' });
    });
  });

  describe('ConnectionManager', () => {
    let connectionManager: ConnectionManager;

    beforeEach(() => {
      connectionManager = new ConnectionManager({
        endpoints: mockEndpoints
      });
    });

    it('should manage RPC endpoints', async () => {
      const connection = await connectionManager.getConnection('mainnet-beta');
      expect(connection).toBeDefined();
    });

    it('should handle failover scenarios', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValueOnce('success');

      const result = await connectionManager.retryWithFailover(mockOperation);
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });
  });

  describe('PerformanceManager', () => {
    let performanceManager: PerformanceManager;

    beforeEach(() => {
      performanceManager = new PerformanceManager({
        maxSize: 100,
        ttl: 1000
      });
    });

    it('should cache request results', async () => {
      const mockOperation = jest.fn().mockResolvedValue('result');
      
      // First call - should execute operation
      await performanceManager.request('test-key', mockOperation);
      
      // Second call - should use cache
      await performanceManager.request('test-key', mockOperation);
      
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should handle batch requests', async () => {
      const mockOperation1 = jest.fn().mockResolvedValue('result1');
      const mockOperation2 = jest.fn().mockResolvedValue('result2');

      const [result1, result2] = await Promise.all([
        performanceManager.request('key1', mockOperation1, { batch: true }),
        performanceManager.request('key1', mockOperation2, { batch: true })
      ]);

      expect(result1).toBe('result1');
      expect(result2).toBe('result2');
    });
  });

  describe('AnalyticsManager', () => {
    let analyticsManager: AnalyticsManager;

    beforeEach(() => {
      analyticsManager = new AnalyticsManager();
    });

    it('should track events', () => {
      analyticsManager.trackEvent('test', { value: 123 });
      const report = analyticsManager.generateReport();
      expect(report.totalEvents).toBe(1);
    });

    it('should calculate error rates', () => {
      analyticsManager.trackEvent('success', { status: 'ok' });
      analyticsManager.trackEvent('error', { message: 'failed' });
      
      expect(analyticsManager.getErrorRate()).toBe(0.5);
    });
  });

  describe('StateManager', () => {
    let stateManager: StateManager;

    beforeEach(() => {
      stateManager = new StateManager();
    });

    it('should manage trusted domains', async () => {
      await stateManager.addTrustedDomain('example.com');
      const domains = stateManager.getTrustedDomains();
      expect(domains).toContain('example.com');
    });

    it('should track recent transactions', async () => {
      const tx = {
        signature: 'test-sig',
        timestamp: Date.now(),
        status: 'success' as const,
        domain: 'example.com'
      };

      await stateManager.addTransaction(tx);
      const transactions = stateManager.getRecentTransactions();
      expect(transactions).toContainEqual(tx);
    });
  });
});
