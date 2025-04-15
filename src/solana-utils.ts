import type { SolanaProvider } from './types';
import { ProviderRpcError, ProviderErrorCode } from './provider-utils';

export interface SolanaCluster {
  name: string;
  endpoint: string;
  chainId: string;
}

export const SOLANA_CLUSTERS: { [key: string]: SolanaCluster } = {
  'mainnet-beta': {
    name: 'Mainnet Beta',
    endpoint: 'https://api.mainnet-beta.solana.com',
    chainId: '101'
  },
  'testnet': {
    name: 'Testnet',
    endpoint: 'https://api.testnet.solana.com',
    chainId: '102'
  },
  'devnet': {
    name: 'Devnet',
    endpoint: 'https://api.devnet.solana.com',
    chainId: '103'
  }
};

export class SolanaProviderRpcError extends ProviderRpcError {
  constructor(error: { code: number; message: string; data?: any }) {
    super(error);
    this.name = 'SolanaProviderRpcError';
  }
}

export class SolanaUtils {
  static PHANTOM_DEEPLINK_URL = 'phantom://';
  static SOLANA_MAINNET = 'mainnet-beta';
  static SOLANA_TESTNET = 'testnet';
  static SOLANA_DEVNET = 'devnet';

  static validateCluster(cluster: string): void {
    if (!SOLANA_CLUSTERS[cluster]) {
      throw new SolanaProviderRpcError({
        code: ProviderErrorCode.UNAUTHORIZED_CHAIN,
        message: `Solana cluster ${cluster} not supported`
      });
    }
  }

  static validatePublicKey(publicKey: string): void {
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(publicKey)) {
      throw new SolanaProviderRpcError({
        code: ProviderErrorCode.INVALID_PARAMS,
        message: 'Invalid Solana public key format'
      });
    }
  }

  static formatSignatureWarning(type: 'transaction' | 'message', origin: string): string {
    const warnings = {
      transaction: `${origin} is requesting to sign a transaction from your Solana wallet`,
      message: `${origin} is requesting to sign a message with your Solana wallet`
    };
    return warnings[type];
  }

  static getClusterExplorerUrl(cluster: string, signature: string, type: 'tx' | 'address' = 'tx'): string {
    const baseUrl = cluster === this.SOLANA_MAINNET 
      ? 'https://explorer.solana.com' 
      : `https://explorer.solana.com/?cluster=${cluster}`;
    return `${baseUrl}/${type}/${signature}`;
  }

  static getBlockExplorerName(cluster: string): string {
    return cluster === this.SOLANA_MAINNET ? 'Solana Explorer' : `Solana ${cluster.charAt(0).toUpperCase() + cluster.slice(1)} Explorer`;
  }

  static async injectPhantomProvider(injectedProvider: SolanaProvider): Promise<string> {
    const publicKey = await injectedProvider.getPublicKey();
    const cluster = await injectedProvider.getCluster();

    return `
      // Solana + Phantom Provider Injection
      (function() {
        if (window.solana) {
          return;
        }

        const solanaPublicKey = "${publicKey}";
        const solanaCluster = "${cluster}";
        const phantomVersion = "1.0.0";

        class PhantomProvider extends EventTarget {
          #isPhantom = true;
          #isConnected = true;
          #publicKey = { toBase58: () => solanaPublicKey };
          #autoApprove = true;

          constructor() {
            super();
            this.connect = this.connect.bind(this);
            this.disconnect = this.disconnect.bind(this);
            this.signTransaction = this.signTransaction.bind(this);
            this.signAllTransactions = this.signAllTransactions.bind(this);
            this.signMessage = this.signMessage.bind(this);
            this.request = this.request.bind(this);
          }

          get isPhantom() { return this.#isPhantom; }
          get isConnected() { return this.#isConnected; }
          get publicKey() { return this.#publicKey; }
          get autoApprove() { return this.#autoApprove; }
          
          async connect() {
            return { publicKey: this.#publicKey };
          }

          async disconnect() {
            return undefined;
          }

          async signTransaction(transaction) {
            const result = await window.bridge.postMessage(JSON.stringify({
              type: 'solanaSignTransaction',
              params: { transaction }
            }));
            return JSON.parse(result);
          }

          async signAllTransactions(transactions) {
            const result = await window.bridge.postMessage(JSON.stringify({
              type: 'solanaSignAllTransactions',
              params: { transactions }
            }));
            return JSON.parse(result);
          }

          async signMessage(message, display = 'utf8') {
            const result = await window.bridge.postMessage(JSON.stringify({
              type: 'solanaSignMessage',
              params: { message, display }
            }));
            return JSON.parse(result);
          }

          async request(method, params) {
            const result = await window.bridge.postMessage(JSON.stringify({
              type: 'solanaRequest',
              method,
              params
            }));
            return JSON.parse(result);
          }
        }

        const provider = new PhantomProvider();
        window.phantom = { solana: provider };
        window.solana = provider;

        // Notify dapp that Phantom is ready
        window.dispatchEvent(new Event('solana#initialized'));
        window.dispatchEvent(new Event('phantom#initialized'));
      })();
    `;
  }
}
