import { EthereumProvider } from '../../types';

export interface EthereumProviderConfig {
  rpcUrl: string;
  chainId: number;
  networkVersion: string;
}

export abstract class BaseEthereumProvider implements EthereumProvider {
  abstract getAddress(): Promise<string>;
  abstract getChainId(): Promise<number>;
  abstract signMessage(message: string): Promise<string>;
  abstract signTypedData(data: any): Promise<string>;
  abstract sendTransaction(tx: any): Promise<string>;
  abstract call(request: any, chainId?: number): Promise<any>;
}