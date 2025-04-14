import { ContractUtils } from './contract-utils';
import { AssetUtils } from './asset-utils';
import { WalletProvider, TransactionRequest } from './types';

export interface SecurityWarning {
  type: 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  details?: string;
}

export class SecurityUtils {
  static async analyzeDappDomain(url: string): Promise<SecurityWarning[]> {
    const warnings: SecurityWarning[] = [];
    try {
      const { hostname } = new URL(url);
      
      // Check for common phishing indicators
      if (hostname.includes('etherscan') && !hostname.endsWith('etherscan.io')) {
        warnings.push({
          type: 'HIGH',
          message: 'Potential phishing site detected',
          details: 'This URL appears to impersonate Etherscan'
        });
      }

      // Add more security checks as needed
      return warnings;
    } catch {
      return [{
        type: 'HIGH',
        message: 'Invalid URL',
        details: 'Could not analyze URL security'
      }];
    }
  }

  static async analyzeTransaction(
    provider: WalletProvider,
    tx: TransactionRequest
  ): Promise<SecurityWarning[]> {
    const warnings: SecurityWarning[] = [];

    try {
      if (!tx.to) {
        warnings.push({
          type: 'HIGH',
          message: 'Contract deployment detected',
          details: 'You are about to deploy a new smart contract'
        });
        return warnings;
      }

      // Check if target is a contract
      const isContract = await ContractUtils.isContract(provider, tx.to);
      
      if (isContract) {
        // Check for token approvals
        if (ContractUtils.isApprovalMethod(tx.data)) {
          const { spender, amount } = ContractUtils.decodeApprovalData(tx.data || '');
          const tokenInfo = await AssetUtils.getTokenInfo(provider, tx.to);

          if (amount === 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff') {
            warnings.push({
              type: 'HIGH',
              message: 'Unlimited token approval requested',
              details: `${tokenInfo.symbol || 'Token'} is requesting unlimited approval for ${spender}`
            });
          }
        }

        // Check for token transfers
        if (ContractUtils.isTokenTransfer(tx.data)) {
          const tokenInfo = await AssetUtils.getTokenInfo(provider, tx.to);
          if (tokenInfo.type === 'UNKNOWN') {
            warnings.push({
              type: 'MEDIUM',
              message: 'Unknown token interaction',
              details: 'This contract does not implement standard token interfaces'
            });
          }
        }
      }

      return warnings;
    } catch (error) {
      console.warn('Security analysis error:', error);
      return warnings;
    }
  }

  static validateSignRequest(data: string | object): SecurityWarning[] {
    const warnings: SecurityWarning[] = [];
    
    if (typeof data === 'string') {
      // Check for common dangerous signing patterns
      if (data.toLowerCase().includes('private key') || 
          data.toLowerCase().includes('seed phrase')) {
        warnings.push({
          type: 'HIGH',
          message: 'Dangerous signature request',
          details: 'This message appears to request sensitive information'
        });
      }
    } else {
      // For typed data (EIP-712)
      const stringified = JSON.stringify(data);
      if (stringified.toLowerCase().includes('permit')) {
        warnings.push({
          type: 'MEDIUM',
          message: 'Token permit requested',
          details: 'This signature may authorize future token transfers'
        });
      }
    }

    return warnings;
  }
}
