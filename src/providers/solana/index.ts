import { Connection, Transaction, PublicKey } from '@solana/web3.js';
import { SolanaProvider } from '../../types';

export interface SolanaProviderConfig {
  cluster: 'mainnet-beta' | 'testnet' | 'devnet';
  rpcEndpoint?: string;
  commitment?: 'processed' | 'confirmed' | 'finalized';
}

export abstract class BaseSolanaProvider implements SolanaProvider {
  protected connection: Connection;
  protected cluster: string;

  constructor(config: SolanaProviderConfig) {
    this.cluster = config.cluster;
    this.connection = new Connection(
      config.rpcEndpoint || this.getDefaultEndpoint(config.cluster),
      config.commitment || 'confirmed'
    );
  }

  abstract getPublicKey(): Promise<string>;
  abstract signTransaction(transaction: any): Promise<string>;
  abstract signAllTransactions(transactions: any[]): Promise<string[]>;
  abstract signMessage(message: Uint8Array | string): Promise<string>;

  getCluster(): Promise<'mainnet-beta' | 'testnet' | 'devnet'> {
    return Promise.resolve(this.cluster as any);
  }

  private getDefaultEndpoint(cluster: string): string {
    const endpoints = {
      'mainnet-beta': 'https://api.mainnet-beta.solana.com',
      'testnet': 'https://api.testnet.solana.com',
      'devnet': 'https://api.devnet.solana.com'
    };
    return endpoints[cluster] || endpoints['mainnet-beta'];
  }
}