import { TransactionRequest } from './types';
import { chains } from './chains';

export function formatTransactionError(error: any): string {
  const message = error.message?.toLowerCase() || '';
  
  if (message.includes('insufficient funds'))
    return 'Insufficient funds for this transaction';
  if (message.includes('nonce'))
    return 'Invalid nonce. Please try again';
  if (message.includes('gas'))
    return 'Gas estimation failed. The transaction may fail';
  if (message.includes('rejected'))
    return 'Transaction rejected';
    
  return error.message || 'Transaction failed';
}

export function getExplorerUrl(chainId: number, hash: string, type: 'tx' | 'address' = 'tx'): string {
  const chain = chains[chainId];
  if (!chain?.explorers?.[0]) return '';
  
  const baseUrl = chain.explorers[0].url;
  return `${baseUrl}/${type}/${hash}`;
}

export function validateAndFormatAddress(address: string): string {
  if (!address.match(/^0x[a-fA-F0-9]{40}$/))
    throw new Error('Invalid Ethereum address');
  return address.toLowerCase();
}

export function validateTransaction(tx: TransactionRequest): void {
  if (!tx.to) throw new Error('Transaction recipient (to) is required');
  validateAndFormatAddress(tx.to);
  
  if (tx.value) {
    if (!tx.value.match(/^0x[a-fA-F0-9]+$/))
      throw new Error('Transaction value must be a hex string');
  }

  if (tx.data && !tx.data.match(/^0x([a-fA-F0-9]{2})*$/))
    throw new Error('Transaction data must be a valid hex string');
}
