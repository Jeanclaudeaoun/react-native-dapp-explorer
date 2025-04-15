import { WebViewProps } from 'react-native-webview';

// Common Types
export interface ProviderError {
  code: number;
  message: string;
  data?: any;
}

// Solana Types
export interface SolanaProvider {
  getPublicKey(): Promise<string>;
  getCluster(): Promise<'mainnet-beta' | 'testnet' | 'devnet'>;
  signTransaction(transaction: any): Promise<string>;
  signAllTransactions(transactions: any[]): Promise<string[]>;
  signMessage(message: Uint8Array | string): Promise<string>;
}

export interface SolanaTransaction {
  feePayer?: string;
  recentBlockhash?: string;
  instructions: any[];
}

// EVM Types
export interface WalletProvider {
  getAddress(): Promise<string>;
  getChainId(): Promise<string>;
  signMessage(msg: string): Promise<string>;
  signTransaction(tx: any): Promise<string>;
  sendTransaction(tx: any): Promise<string>;
}

// Component Props
export interface Web3ViewProps extends Omit<WebViewProps, 'source' | 'injectedJavaScript'> {
  provider: WalletProvider;
  solanaProvider?: SolanaProvider;
  url: string;
  chainId: number;
  
  // Chain management
  onChainChanged?: (chainId: number) => void;
  
  // EVM events
  onTransactionStart?: (tx: any) => void;
  onTransactionHash?: (hash: string) => void;
  onTransactionComplete?: (hash: string, success: boolean) => void;
  onSignMessage?: (message: string) => void;
  onSignComplete?: (signature: string) => void;
  
  // Solana events
  onSolanaTransactionStart?: (tx: SolanaTransaction | SolanaTransaction[]) => void;
  onSolanaTransactionComplete?: (signature: string, success: boolean) => void;
  onSolanaSignMessage?: (message: Uint8Array | string) => void;
  
  // Security
  trustedDomains?: string[];
  allowedMethods?: string[];
  
  // Error handling
  onError?: (error: Error | string) => void;
}
