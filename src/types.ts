import { TransactionRequest } from '@ethersproject/abstract-provider';
import { Transaction } from '@solana/web3.js';

export type SolanaCluster = 'mainnet-beta' | 'testnet' | 'devnet';

export interface SolanaProvider {
  getPublicKey(): Promise<string>;
  getCluster(): Promise<SolanaCluster>;
  signTransaction(transaction: string): Promise<string>;
  signAllTransactions(transactions: string[]): Promise<string[]>;
  signMessage(message: Uint8Array | string): Promise<string>;
}

export interface EthereumProvider {
  getAddress(): Promise<string>;
  getChainId(): Promise<number>;
  signMessage(message: string): Promise<string>;
  signTypedData?(data: any): Promise<string>;
  sendTransaction(tx: TransactionRequest): Promise<string>;
  call?(request: any, chainId?: number): Promise<any>;
}
