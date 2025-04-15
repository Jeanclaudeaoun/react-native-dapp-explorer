import type { Transaction, TransactionSignature } from '@solana/web3.js';
import type { StyleProp, ViewStyle } from 'react-native';
import type { WebViewProps } from 'react-native-webview';

export interface RPCEndpoint {
  url: string;
  weight: number;
  latency: number;
  lastCheck: number;
  isHealthy: boolean;
}

export interface ConnectionConfig {
  endpoints: { [cluster: string]: string[] };
  maxRetries?: number;
  healthCheckInterval?: number;
  loadBalancing?: boolean;
}

export interface CacheConfig {
  maxSize?: number;
  ttl?: number;
}

export interface DAppManagerConfig {
  endpoints: { [cluster: string]: string[] };
  maxConcurrentRequests?: number;
  cacheSize?: number;
  cacheTTL?: number;
  healthCheckInterval?: number;
}

export interface AnalyticsEvent {
  type: string;
  timestamp: number;
  data: any;
}

export interface DAppMetrics {
  loadTime: number;
  transactionCount: number;
  errorCount: number;
  lastInteraction: number;
}

export interface BrowserSettings {
  clearOnExit: boolean;
  autoApproveLimit: number;
  defaultCluster: string;
  customRpcUrls: Record<string, string>;
}

export interface RecentTransaction {
  signature: string;
  timestamp: number;
  status: 'success' | 'error';
  domain: string;
}

export interface SolanaProvider {
  getPublicKey: () => Promise<string>;
  getCluster: () => Promise<string>;
  signTransaction: (transaction: string) => Promise<string>;
  signAllTransactions: (transactions: string[]) => Promise<string[]>;
  signMessage: (message: string | Uint8Array) => Promise<Uint8Array>;
}

export interface EnhancedWeb3ViewProps extends Omit<WebViewProps, 'source'> {
  provider?: any;
  solanaProvider?: SolanaProvider;
  url: string;
  chainId: number;
  style?: StyleProp<ViewStyle>;
  onChainChanged?: (chainId: number) => void;
  onAccountsChanged?: (accounts: string[]) => void;
  onTransactionStart?: (transaction: any) => void;
  onTransactionHash?: (hash: string) => void;
  onTransactionComplete?: (receipt: any) => void;
  onSignMessage?: (message: string | Uint8Array) => void;
  onSignComplete?: (signature: string) => void;
  onSolanaTransactionStart?: (transaction: Transaction) => void;
  onSolanaTransactionComplete?: (signature: TransactionSignature, success: boolean) => void;
  onSolanaSignMessage?: (message: string | Uint8Array) => void;
  onError?: (error: Error) => void;
  trustedDomains?: string[];
  allowedMethods?: string[];
  customRpcEndpoints?: { [cluster: string]: string[] };
}

export interface SecurityConfig {
  maxTransactionSize?: number;
  maxSignatures?: number;
  allowedProgramIds?: string[];
  blockedProgramIds?: string[];
  maxInstructions?: number;
  requireRecentBlockhash?: boolean;
}

export interface NavigationConfig {
  trustedDomains?: string[];
  maxHistoryLength?: number;
  blockExternalNavigation?: boolean;
  allowedProtocols?: string[];
}

export interface DeepLinkConfig {
  schemes: string[];
  debug?: boolean;
}

export interface BridgeCallback {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
}

export interface BridgeMessage {
  id: string;
  type: string;
  method?: string;
  params?: any;
}

export interface StorageKeys {
  HISTORY: string;
  TRUSTED_DOMAINS: string;
  RECENT_TRANSACTIONS: string;
  SETTINGS: string;
}

export interface RequestBatch {
  requests: any[];
  resolve: (value: any) => void;
  reject: (error: Error) => void;
}
