import AsyncStorage from '@react-native-async-storage/async-storage';
import EventEmitter from 'eventemitter3';

interface StorageKeys {
  HISTORY: string;
  TRUSTED_DOMAINS: string;
  RECENT_TRANSACTIONS: string;
  SETTINGS: string;
}

interface BrowserSettings {
  clearOnExit: boolean;
  autoApproveLimit: number;
  defaultCluster: string;
  customRpcUrls: Record<string, string>;
}

interface RecentTransaction {
  signature: string;
  timestamp: number;
  status: 'success' | 'error';
  domain: string;
}

export class StateManager extends EventEmitter {
  private static readonly KEYS: StorageKeys = {
    HISTORY: '@dapp-browser/history',
    TRUSTED_DOMAINS: '@dapp-browser/trusted-domains',
    RECENT_TRANSACTIONS: '@dapp-browser/recent-transactions',
    SETTINGS: '@dapp-browser/settings'
  };

  private static readonly MAX_HISTORY = 100;
  private static readonly MAX_RECENT_TRANSACTIONS = 50;

  private history: string[];
  private trustedDomains: Set<string>;
  private recentTransactions: RecentTransaction[];
  private settings: BrowserSettings;

  constructor() {
    super();
    this.history = [];
    this.trustedDomains = new Set();
    this.recentTransactions = [];
    this.settings = {
      clearOnExit: false,
      autoApproveLimit: 0.1, // SOL
      defaultCluster: 'mainnet-beta',
      customRpcUrls: {}
    };
  }

  async initialize(): Promise<void> {
    try {
      await this.loadHistory();
      await this.loadTrustedDomains();
      await this.loadRecentTransactions();
      await this.loadSettings();
    } catch (error) {
      console.error('Error initializing state:', error);
      // Continue with default values if loading fails
    }
  }

  private async loadHistory(): Promise<void> {
    try {
      const historyJson = await AsyncStorage.getItem(StateManager.KEYS.HISTORY);
      if (historyJson) {
        this.history = JSON.parse(historyJson);
        this.emit('historyLoaded', this.history);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
  }

  private async loadTrustedDomains(): Promise<void> {
    try {
      const domainsJson = await AsyncStorage.getItem(StateManager.KEYS.TRUSTED_DOMAINS);
      if (domainsJson) {
        this.trustedDomains = new Set(JSON.parse(domainsJson));
        this.emit('trustedDomainsLoaded', Array.from(this.trustedDomains));
      }
    } catch (error) {
      console.error('Error loading trusted domains:', error);
    }
  }

  private async loadRecentTransactions(): Promise<void> {
    try {
      const txJson = await AsyncStorage.getItem(StateManager.KEYS.RECENT_TRANSACTIONS);
      if (txJson) {
        this.recentTransactions = JSON.parse(txJson);
        this.emit('transactionsLoaded', this.recentTransactions);
      }
    } catch (error) {
      console.error('Error loading recent transactions:', error);
    }
  }

  private async loadSettings(): Promise<void> {
    try {
      const settingsJson = await AsyncStorage.getItem(StateManager.KEYS.SETTINGS);
      if (settingsJson) {
        this.settings = { ...this.settings, ...JSON.parse(settingsJson) };
        this.emit('settingsLoaded', this.settings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  async addToHistory(url: string): Promise<void> {
    this.history.push(url);
    if (this.history.length > StateManager.MAX_HISTORY) {
      this.history = this.history.slice(-StateManager.MAX_HISTORY);
    }
    await AsyncStorage.setItem(StateManager.KEYS.HISTORY, JSON.stringify(this.history));
    this.emit('historyUpdated', this.history);
  }

  async addTrustedDomain(domain: string): Promise<void> {
    this.trustedDomains.add(domain);
    await AsyncStorage.setItem(
      StateManager.KEYS.TRUSTED_DOMAINS,
      JSON.stringify(Array.from(this.trustedDomains))
    );
    this.emit('trustedDomainsUpdated', Array.from(this.trustedDomains));
  }

  async removeTrustedDomain(domain: string): Promise<void> {
    this.trustedDomains.delete(domain);
    await AsyncStorage.setItem(
      StateManager.KEYS.TRUSTED_DOMAINS,
      JSON.stringify(Array.from(this.trustedDomains))
    );
    this.emit('trustedDomainsUpdated', Array.from(this.trustedDomains));
  }

  async addTransaction(tx: RecentTransaction): Promise<void> {
    this.recentTransactions.unshift(tx);
    if (this.recentTransactions.length > StateManager.MAX_RECENT_TRANSACTIONS) {
      this.recentTransactions = this.recentTransactions.slice(0, StateManager.MAX_RECENT_TRANSACTIONS);
    }
    await AsyncStorage.setItem(
      StateManager.KEYS.RECENT_TRANSACTIONS,
      JSON.stringify(this.recentTransactions)
    );
    this.emit('transactionsUpdated', this.recentTransactions);
  }

  async updateSettings(newSettings: Partial<BrowserSettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    await AsyncStorage.setItem(StateManager.KEYS.SETTINGS, JSON.stringify(this.settings));
    this.emit('settingsUpdated', this.settings);
  }

  async clearHistory(): Promise<void> {
    this.history = [];
    await AsyncStorage.removeItem(StateManager.KEYS.HISTORY);
    this.emit('historyUpdated', this.history);
  }

  async clearAll(): Promise<void> {
    await Promise.all([
      AsyncStorage.removeItem(StateManager.KEYS.HISTORY),
      AsyncStorage.removeItem(StateManager.KEYS.TRUSTED_DOMAINS),
      AsyncStorage.removeItem(StateManager.KEYS.RECENT_TRANSACTIONS),
      AsyncStorage.removeItem(StateManager.KEYS.SETTINGS)
    ]);
    
    this.history = [];
    this.trustedDomains = new Set();
    this.recentTransactions = [];
    this.settings = {
      clearOnExit: false,
      autoApproveLimit: 0.1,
      defaultCluster: 'mainnet-beta',
      customRpcUrls: {}
    };

    this.emit('stateCleared');
  }

  getHistory(): string[] {
    return [...this.history];
  }

  getTrustedDomains(): string[] {
    return Array.from(this.trustedDomains);
  }

  getRecentTransactions(): RecentTransaction[] {
    return [...this.recentTransactions];
  }

  getSettings(): BrowserSettings {
    return { ...this.settings };
  }
}
