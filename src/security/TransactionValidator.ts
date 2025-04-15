import { Transaction } from '@solana/web3.js';
import { ethers } from 'ethers';

export interface SecurityConfig {
  maxTransactionSize: number;
  maxSignatures: number;
  maxInstructions: number;
  trustedDomains: string[];
  requireRecentBlockhash: boolean;
}

export class TransactionValidator {
  constructor(private config: SecurityConfig) {}

  validateSolanaTransaction(serializedTx: string): void {
    const txBytes = Buffer.from(serializedTx, 'base64');
    if (txBytes.length > this.config.maxTransactionSize) {
      throw new Error(`Transaction size exceeds maximum allowed (${txBytes.length} > ${this.config.maxTransactionSize} bytes)`);
    }

    const tx = Transaction.from(txBytes);
    if (tx.signatures.length > this.config.maxSignatures) {
      throw new Error(`Too many signatures (${tx.signatures.length} > ${this.config.maxSignatures})`);
    }

    if (this.config.requireRecentBlockhash && !tx.recentBlockhash) {
      throw new Error('Transaction must include a recent blockhash');
    }
  }

  validateEVMTransaction(tx: any): void {
    // Validate EVM transaction parameters
    if (!tx.to) {
      throw new Error('Transaction must include a recipient address');
    }

    if (tx.value) {
      try {
        ethers.parseUnits(tx.value.toString(), 'wei');
      } catch {
        throw new Error('Invalid transaction value');
      }
    }

    if (tx.data && tx.data.length > this.config.maxTransactionSize * 2) {
      throw new Error(`Transaction data size exceeds maximum allowed`);
    }
  }

  validateDomain(url: string): boolean {
    try {
      const domain = new URL(url).hostname;
      return this.config.trustedDomains.includes(domain);
    } catch {
      return false;
    }
  }
}