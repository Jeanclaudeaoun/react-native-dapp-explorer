import { WebViewProps } from 'react-native-webview';

export interface WalletProvider {
  // Core wallet methods
  getAddress(): Promise<string>;
  getChainId(): Promise<number>;
  signMessage(message: string): Promise<string>;
  sendTransaction(tx: TransactionRequest): Promise<string>;

  // Optional methods
  signTypedData?(data: any): Promise<string>;
  request?(args: { method: string; params?: any[] }): Promise<any>;
}

export interface TransactionRequest {
  from?: string;
  to: string;
  value?: string;
  data?: string;
  gas?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  nonce?: string;
}

export interface Web3ViewProps extends Omit<WebViewProps, 'source' | 'injectedJavaScript'> {
  // Required props
  provider: WalletProvider;
  url: string;
  chainId: number;

  // Chain management
  onChainChanged?: (chainId: number) => Promise<void>;
  
  // Transaction events
  onTransactionStart?: (tx: TransactionRequest) => void;
  onTransactionHash?: (hash: string) => void;
  onTransactionComplete?: (hash: string, success: boolean, explorerUrl?: string) => void;
  
  // Signing events
  onSignMessage?: (message: string) => void;
  onSignComplete?: (signature: string) => void;
  
  // Error handling
  onError?: (error: string | Error) => void;

  // Optional security configs
  trustedDomains?: string[];
  allowedMethods?: string[];
}
