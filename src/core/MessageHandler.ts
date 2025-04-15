import { WebViewMessageEvent } from 'react-native-webview';
import { SolanaProvider, EthereumProvider } from '../types';
import { TransactionValidator } from '../security/TransactionValidator';

export interface MessageHandlerConfig {
  ethProvider?: EthereumProvider;
  solanaProvider?: SolanaProvider;
  securityValidator: TransactionValidator;
  onError?: (error: Error) => void;
}

export class MessageHandler {
  constructor(private config: MessageHandlerConfig) {}

  async handleMessage(event: WebViewMessageEvent) {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      const { type, method, params, id } = data;

      if (type?.startsWith('solana') && this.config.solanaProvider) {
        await this.handleSolanaMessage(type, method, params, id);
      } else if (this.config.ethProvider) {
        await this.handleEthereumMessage(method, params, id);
      }
    } catch (error) {
      this.config.onError?.(error as Error);
    }
  }

  private async handleSolanaMessage(type: string, method: string, params: any, id: string) {
    switch (type) {
      case 'solanaSignTransaction':
        this.config.securityValidator.validateSolanaTransaction(params.transaction);
        return await this.config.solanaProvider!.signTransaction(params.transaction);
      
      case 'solanaSignAllTransactions':
        params.transactions.forEach(tx => 
          this.config.securityValidator.validateSolanaTransaction(tx)
        );
        return await this.config.solanaProvider!.signAllTransactions(params.transactions);
      
      case 'solanaSignMessage':
        return await this.config.solanaProvider!.signMessage(params.message);
    }
  }

  private async handleEthereumMessage(method: string, params: any, id: string) {
    switch (method) {
      case 'eth_sendTransaction':
        this.config.securityValidator.validateEVMTransaction(params[0]);
        return await this.config.ethProvider!.sendTransaction(params[0]);
      
      case 'eth_sign':
      case 'personal_sign':
        return await this.config.ethProvider!.signMessage(params[0]);
      
      case 'eth_signTypedData_v4':
        return await this.config.ethProvider!.signTypedData(params[0]);
      
      default:
        return await this.config.ethProvider!.call({ method, params });
    }
  }
}