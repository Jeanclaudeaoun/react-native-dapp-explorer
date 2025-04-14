import { TransactionRequest } from './types';
import { ProviderRpcError, ProviderErrorCode } from './provider-utils';

export const CHAIN_METADATA: Record<number, { name: string; network: string; nativeCurrency: { symbol: string; decimals: number } }> = {
  1: {
    name: 'Ethereum Mainnet',
    network: 'mainnet',
    nativeCurrency: { symbol: 'ETH', decimals: 18 }
  },
  137: {
    name: 'Polygon Mainnet',
    network: 'polygon',
    nativeCurrency: { symbol: 'MATIC', decimals: 18 }
  },
  56: {
    name: 'BNB Smart Chain',
    network: 'bsc',
    nativeCurrency: { symbol: 'BNB', decimals: 18 }
  },
  // Add more chains as needed
};

export function validateTransaction(tx: TransactionRequest): void {
  if (!tx.to) {
    throw new ProviderRpcError({
      code: ProviderErrorCode.INVALID_PARAMS,
      message: 'Invalid transaction: missing to address'
    });
  }

  if (tx.value) {
    try {
      BigInt(tx.value);
    } catch {
      throw new ProviderRpcError({
        code: ProviderErrorCode.INVALID_PARAMS,
        message: 'Invalid transaction: invalid value'
      });
    }
  }

  if (tx.gas) {
    try {
      BigInt(tx.gas);
    } catch {
      throw new ProviderRpcError({
        code: ProviderErrorCode.INVALID_PARAMS,
        message: 'Invalid transaction: invalid gas'
      });
    }
  }
}

export function validateChainId(chainId: number): void {
  if (!CHAIN_METADATA[chainId]) {
    throw new ProviderRpcError({
      code: ProviderErrorCode.UNAUTHORIZED_CHAIN,
      message: `Chain ID ${chainId} not supported`
    });
  }
}

export function formatAddress(address: string): string {
  return address.toLowerCase();
}

export function sanitizeHexData(data: string): string {
  if (!data) return '0x';
  return data.startsWith('0x') ? data : `0x${data}`;
}

export function validateHexString(hex: string, length?: number): boolean {
  const hexRegex = /^0x[0-9a-fA-F]*$/;
  if (!hexRegex.test(hex)) return false;
  if (length && hex.length !== length + 2) return false; // +2 for '0x' prefix
  return true;
}
