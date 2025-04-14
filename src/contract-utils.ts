import { WalletProvider } from './types';

export class ContractUtils {
  // Common token approval method signature
  private static APPROVE_SIGNATURE = '0x095ea7b3';
  
  // Common token methods
  private static TOKEN_METHODS = {
    TRANSFER: '0xa9059cbb',
    TRANSFER_FROM: '0x23b872dd',
    SAFE_TRANSFER_FROM: '0x42842e0e'
  };

  static isApprovalMethod(data?: string): boolean {
    return data?.startsWith(this.APPROVE_SIGNATURE) || false;
  }

  static isTokenTransfer(data?: string): boolean {
    if (!data) return false;
    return Object.values(this.TOKEN_METHODS).some(signature => 
      data.startsWith(signature)
    );
  }

  static decodeApprovalData(data: string): { spender: string; amount: string } {
    // Remove method signature
    const params = data.slice(10);
    
    // Extract spender address (first 32 bytes after method signature)
    const spender = '0x' + params.slice(24, 64);
    
    // Extract amount (next 32 bytes)
    const amount = '0x' + params.slice(64, 128);

    return { spender, amount };
  }

  static async isContract(provider: WalletProvider, address: string): Promise<boolean> {
    try {
      const code = await provider.request?.({
        method: 'eth_getCode',
        params: [address, 'latest']
      });
      return code !== '0x' && code !== '0x0';
    } catch {
      return false;
    }
  }

  static formatMethodError(error: any): string {
    // Common revert strings and custom errors
    const revertMatch = error.message.match(/reverted with reason string '(.+)'/);
    if (revertMatch) return revertMatch[1];

    // Custom error signatures
    if (error.message.includes('custom error')) {
      return 'Transaction failed: Contract rejected the operation';
    }

    // Gas estimation failures
    if (error.message.includes('gas required exceeds allowance')) {
      return 'Transaction might fail: Insufficient gas';
    }

    return error.message;
  }

  static estimateApprovalGas(provider: WalletProvider, params: {
    tokenAddress: string;
    spender: string;
    amount: string;
    from: string;
  }): Promise<string> {
    const data = `${this.APPROVE_SIGNATURE}${
      params.spender.slice(2).padStart(64, '0')
    }${params.amount.slice(2).padStart(64, '0')}`;

    return provider.request?.({
      method: 'eth_estimateGas',
      params: [{
        from: params.from,
        to: params.tokenAddress,
        data
      }]
    }) || Promise.resolve('0x0');
  }
}
