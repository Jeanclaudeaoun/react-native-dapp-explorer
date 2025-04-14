import { EthereumProvider } from '../src/types';
import { Web3Modal } from '@web3modal/standalone';
import { SignClient } from '@walletconnect/sign-client';
import { ProviderRpcError } from '../src/provider-utils';

export class WalletConnectProvider implements EthereumProvider {
  private client: SignClient;
  private session: any;
  private chainId: number;

  constructor(projectId: string, chainId: number) {
    this.chainId = chainId;
    this.initializeClient(projectId);
  }

  private async initializeClient(projectId: string) {
    this.client = await SignClient.init({
      projectId,
      metadata: {
        name: 'Your Wallet',
        description: 'Example WalletConnect Integration',
        url: 'https://your-wallet.app',
        icons: ['https://your-wallet.app/icon.png']
      }
    });
  }

  async getAddress(): Promise<string> {
    if (!this.session?.address) {
      throw new ProviderRpcError({
        code: 4100,
        message: 'No account connected'
      });
    }
    return this.session.address;
  }

  async getChainId(): Promise<number> {
    return this.chainId;
  }

  async signMessage(message: string): Promise<string> {
    const address = await this.getAddress();
    const result = await this.client.request({
      topic: this.session.topic,
      chainId: this.chainId,
      request: {
        method: 'personal_sign',
        params: [message, address]
      }
    });
    return result;
  }

  async signTypedData(data: any): Promise<string> {
    const address = await this.getAddress();
    const result = await this.client.request({
      topic: this.session.topic,
      chainId: this.chainId,
      request: {
        method: 'eth_signTypedData_v4',
        params: [address, JSON.stringify(data)]
      }
    });
    return result;
  }

  async sendTransaction(tx: any): Promise<string> {
    const result = await this.client.request({
      topic: this.session.topic,
      chainId: this.chainId,
      request: {
        method: 'eth_sendTransaction',
        params: [tx]
      }
    });
    return result;
  }

  async setChainId(chainId: number): Promise<void> {
    this.chainId = chainId;
    // Emit chainChanged if needed
  }

  async call(request: any, chainId?: number): Promise<any> {
    return await this.client.request({
      topic: this.session.topic,
      chainId: chainId || this.chainId,
      request
    });
  }

  async send(request: any, chainId?: number): Promise<any> {
    return this.call(request, chainId);
  }
}
