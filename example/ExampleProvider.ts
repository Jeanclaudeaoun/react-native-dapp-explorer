import { EthereumProvider } from '../src/types';
import { ethers } from 'ethers';

/**
 * Example implementation of a wallet provider.
 * Replace this with your actual wallet implementation.
 */
export class ExampleProvider implements EthereumProvider {
  private wallet: ethers.Wallet;
  private provider: ethers.JsonRpcProvider;
  
  constructor(privateKey: string, rpcUrl: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
  }

  async getAddress(): Promise<string> {
    return this.wallet.address;
  }

  async getChainId(chainId?: number): Promise<number> {
    if (chainId) return chainId;
    const network = await this.provider.getNetwork();
    return Number(network.chainId);
  }

  async getBlockNumber(chainId?: number): Promise<string> {
    const blockNumber = await this.provider.getBlockNumber();
    return '0x' + blockNumber.toString(16);
  }

  async signMessage(message: string): Promise<string> {
    // Handle both hex and plain text messages
    const messageBytes = message.startsWith('0x') 
      ? ethers.getBytes(message)
      : ethers.toUtf8Bytes(message);
    return await this.wallet.signMessage(messageBytes);
  }

  async signTypedData(data: any): Promise<string> {
    return await this.wallet.signTypedData(
      data.domain,
      data.types,
      data.message
    );
  }

  async sendTransaction(tx: any): Promise<string> {
    const transaction = await this.wallet.sendTransaction(tx);
    return transaction.hash;
  }

  async setChainId(chainId: number): Promise<void> {
    // Implement chain switching logic here
    // This is just an example - you should implement proper chain switching
    this.provider = new ethers.JsonRpcProvider(
      this.getChainRpcUrl(chainId)
    );
    this.wallet = this.wallet.connect(this.provider);
  }

  async call(request: any, chainId?: number): Promise<any> {
    return await this.provider.send(request.method, request.params || []);
  }

  async send(request: any, chainId?: number): Promise<any> {
    return await this.provider.send(request.method, request.params || []);
  }

  private getChainRpcUrl(chainId: number): string {
    // Replace with your RPC URL mapping
    const chainUrls: Record<number, string> = {
      1: 'https://eth-mainnet.g.alchemy.com/v2/your-api-key',
      5: 'https://eth-goerli.g.alchemy.com/v2/your-api-key',
      137: 'https://polygon-mainnet.g.alchemy.com/v2/your-api-key',
    };
    
    const url = chainUrls[chainId];
    if (!url) throw new Error(`Chain ID ${chainId} not supported`);
    return url;
  }
}
