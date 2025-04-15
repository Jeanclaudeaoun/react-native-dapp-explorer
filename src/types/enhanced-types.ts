import { WebViewProps } from 'react-native-webview';
import { Transaction } from '@solana/web3.js';

export type SolanaCluster = 'mainnet-beta' | 'testnet' | 'devnet';

export type ChainType = 'evm' | 'solana';

export interface TransactionMetadata {
  timestamp: number;
  hash: string;
  chain: ChainType;
  status: 'pending' | 'success' | 'failed';
  domain: string;
}

export interface SecurityRule {
  type: 'transaction' | 'message' | 'domain';
  level: 'low' | 'medium' | 'high';
  pattern: string | RegExp;
  message: string;
}

export interface RpcEndpoint {
  url: string;
  weight: number;
  healthCheck: () => Promise<boolean>;
}

export interface RpcConfig {
  endpoints: Record<string, RpcEndpoint[]>;
  timeout?: number;
  retries?: number;
}

export interface AnalyticsEvent {
  type: 'transaction' | 'signature' | 'connection' | 'error';
  chainType: ChainType;
  timestamp: number;
  data: Record<string, any>;
}

export interface DAppMetadata {
  name: string;
  icon?: string;
  url: string;
  description?: string;
  chains: ChainType[];
}

// Extended provider interfaces
export interface EnhancedSolanaProvider {
  getPublicKey(): Promise<string>;
  getCluster(): Promise<SolanaCluster>;
  signTransaction(transaction: string): Promise<string>;
  signAllTransactions(transactions: string[]): Promise<string[]>;
  signMessage(message: Uint8Array | string): Promise<string>;
  simulateTransaction?(transaction: Transaction): Promise<boolean>;
  validateProgram?(programId: string): Promise<boolean>;
}

export interface EnhancedEthereumProvider {
  getAddress(): Promise<string>;
  getChainId(): Promise<number>;
  signMessage(message: string): Promise<string>;
  signTypedData(data: any): Promise<string>;
  sendTransaction(tx: any): Promise<string>;
  call(request: any, chainId?: number): Promise<any>;
  estimateGas?(tx: any): Promise<string>;
  validateContract?(address: string): Promise<boolean>;
}

// Enhanced component props
export interface EnhancedWeb3ViewProps extends Omit<WebViewProps, 'source' | 'injectedJavaScript'> {
  ethProvider?: EnhancedEthereumProvider;
  solanaProvider?: EnhancedSolanaProvider;
  url: string;
  chainId: number;
  securityConfig?: {
    maxTransactionSize: number;
    maxSignatures: number;
    maxInstructions: number;
    requireRecentBlockhash: boolean;
    trustedDomains: string[];
    customRules?: SecurityRule[];
  };
  rpcConfig?: RpcConfig;
  analytics?: {
    enabled: boolean;
    onEvent?: (event: AnalyticsEvent) => void;
  };
  onChainChanged?: (chainId: number) => void;
  onTransactionStart?: (tx: any) => void;
  onTransactionHash?: (hash: string) => void;
  onTransactionComplete?: (hash: string, success: boolean) => void;
  onSignMessage?: (message: string) => void;
  onSignComplete?: (signature: string) => void;
  onSolanaTransactionStart?: (tx: any) => void;
  onSolanaTransactionComplete?: (signature: string, success: boolean) => void;
  onSolanaSignMessage?: (message: Uint8Array | string) => void;
  onError?: (error: Error) => void;
  onDAppLoaded?: (metadata: DAppMetadata) => void;
}
