import { WalletProvider, TransactionRequest } from './types';

interface GasEstimate {
  gas: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  gasPrice?: string;
}

export class TransactionUtils {
  static async estimateGas(
    provider: WalletProvider,
    tx: TransactionRequest
  ): Promise<GasEstimate> {
    try {
      // Get current block to check if network supports EIP-1559
      const block = await provider.request?.({
        method: 'eth_getBlockByNumber',
        params: ['latest', false]
      });

      const gasEstimate = await provider.request?.({
        method: 'eth_estimateGas',
        params: [tx]
      }) || '0x0';

      // Add 20% buffer to gas estimate for safety
      const gasLimit = BigInt(gasEstimate) * BigInt(120) / BigInt(100);
      
      if (block?.baseFeePerGas) {
        // EIP-1559 transaction
        const baseFee = BigInt(block.baseFeePerGas);
        const priorityFee = await this.estimatePriorityFee(provider);
        
        return {
          gas: '0x' + gasLimit.toString(16),
          maxFeePerGas: '0x' + (baseFee * BigInt(2) + priorityFee).toString(16),
          maxPriorityFeePerGas: '0x' + priorityFee.toString(16)
        };
      } else {
        // Legacy transaction
        const gasPrice = await provider.request?.({
          method: 'eth_gasPrice',
          params: []
        }) || '0x0';

        return {
          gas: '0x' + gasLimit.toString(16),
          gasPrice
        };
      }
    } catch (error) {
      console.warn('Gas estimation failed:', error);
      // Return a safe default if estimation fails
      return {
        gas: '0x55F0', // 22,000 units
        gasPrice: await provider.request?.({
          method: 'eth_gasPrice',
          params: []
        }) || '0x0'
      };
    }
  }

  private static async estimatePriorityFee(provider: WalletProvider): Promise<bigint> {
    try {
      const fee = await provider.request?.({
        method: 'eth_maxPriorityFeePerGas',
        params: []
      });
      return BigInt(fee || '0x0');
    } catch {
      // If the RPC doesn't support eth_maxPriorityFeePerGas, use a reasonable default
      return BigInt('0x3b9aca00'); // 1 Gwei
    }
  }

  static async monitorTransaction(
    provider: WalletProvider,
    hash: string,
    onStatus: (status: {
      hash: string;
      status: 'pending' | 'success' | 'failed';
      confirmations: number;
      receipt?: any;
    }) => void
  ): Promise<void> {
    const checkReceipt = async () => {
      try {
        const receipt = await provider.request?.({
          method: 'eth_getTransactionReceipt',
          params: [hash]
        });

        if (!receipt) {
          onStatus({ hash, status: 'pending', confirmations: 0 });
          setTimeout(checkReceipt, 3000); // Check again in 3 seconds
          return;
        }

        // Get current block for confirmation count
        const currentBlock = await provider.request?.({
          method: 'eth_blockNumber',
          params: []
        });

        const confirmations = receipt.blockNumber
          ? BigInt(currentBlock) - BigInt(receipt.blockNumber) + BigInt(1)
          : 0;

        onStatus({
          hash,
          status: receipt.status === '0x1' ? 'success' : 'failed',
          confirmations: Number(confirmations),
          receipt
        });
      } catch (error) {
        console.warn('Error monitoring transaction:', error);
        setTimeout(checkReceipt, 3000); // Retry on error
      }
    };

    checkReceipt();
  }

  static formatGasToHuman(gas: string, decimals: number = 9): string {
    const value = BigInt(gas);
    const divisor = BigInt(10 ** decimals);
    const integerPart = value / divisor;
    const decimalPart = value % divisor;
    
    return `${integerPart}.${decimalPart.toString().padStart(decimals, '0')}`;
  }
}
