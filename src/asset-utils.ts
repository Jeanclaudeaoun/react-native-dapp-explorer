import { WalletProvider } from './types';

const ERC20_INTERFACE_ID = '0x36372b07';
const ERC721_INTERFACE_ID = '0x80ac58cd';
const ERC1155_INTERFACE_ID = '0xd9b67a26';

export type TokenType = 'ERC20' | 'ERC721' | 'ERC1155' | 'UNKNOWN';

interface TokenInfo {
  type: TokenType;
  name?: string;
  symbol?: string;
  decimals?: number;
}

export class AssetUtils {
  static async detectTokenType(provider: WalletProvider, address: string): Promise<TokenType> {
    try {
      // Try ERC165 interface detection
      const supportsERC165 = await this.supportsInterface(provider, address, '0x01ffc9a7');
      
      if (supportsERC165) {
        // Check common token interfaces
        const [isERC20, isERC721, isERC1155] = await Promise.all([
          this.supportsInterface(provider, address, ERC20_INTERFACE_ID),
          this.supportsInterface(provider, address, ERC721_INTERFACE_ID),
          this.supportsInterface(provider, address, ERC1155_INTERFACE_ID)
        ]);

        if (isERC721) return 'ERC721';
        if (isERC1155) return 'ERC1155';
        if (isERC20) return 'ERC20';
      }

      // Fallback: Try to detect ERC20 by checking basic methods
      const isERC20 = await this.isERC20(provider, address);
      if (isERC20) return 'ERC20';

      return 'UNKNOWN';
    } catch {
      return 'UNKNOWN';
    }
  }

  private static async supportsInterface(
    provider: WalletProvider,
    address: string,
    interfaceId: string
  ): Promise<boolean> {
    try {
      const result = await provider.request?.({
        method: 'eth_call',
        params: [{
          to: address,
          data: `0x01ffc9a7${interfaceId.slice(2).padEnd(64, '0')}`
        }, 'latest']
      });
      return result === '0x0000000000000000000000000000000000000000000000000000000000000001';
    } catch {
      return false;
    }
  }

  private static async isERC20(provider: WalletProvider, address: string): Promise<boolean> {
    try {
      // Check if contract has basic ERC20 methods
      const [nameResult, symbolResult, decimalsResult] = await Promise.all([
        provider.request?.({
          method: 'eth_call',
          params: [{
            to: address,
            data: '0x06fdde03' // name()
          }, 'latest']
        }),
        provider.request?.({
          method: 'eth_call',
          params: [{
            to: address,
            data: '0x95d89b41' // symbol()
          }, 'latest']
        }),
        provider.request?.({
          method: 'eth_call',
          params: [{
            to: address,
            data: '0x313ce567' // decimals()
          }, 'latest']
        })
      ]);

      return Boolean(nameResult && symbolResult && decimalsResult);
    } catch {
      return false;
    }
  }

  static async getTokenInfo(provider: WalletProvider, address: string): Promise<TokenInfo> {
    const type = await this.detectTokenType(provider, address);
    
    if (type === 'ERC20') {
      try {
        const [nameResult, symbolResult, decimalsResult] = await Promise.all([
          provider.request?.({
            method: 'eth_call',
            params: [{
              to: address,
              data: '0x06fdde03' // name()
            }, 'latest']
          }),
          provider.request?.({
            method: 'eth_call',
            params: [{
              to: address,
              data: '0x95d89b41' // symbol()
            }, 'latest']
          }),
          provider.request?.({
            method: 'eth_call',
            params: [{
              to: address,
              data: '0x313ce567' // decimals()
            }, 'latest']
          })
        ]);

        return {
          type,
          name: this.decodeString(nameResult || ''),
          symbol: this.decodeString(symbolResult || ''),
          decimals: this.decodeUint8(decimalsResult || '')
        };
      } catch {
        return { type };
      }
    }

    return { type };
  }

  private static decodeString(hex: string): string {
    try {
      // Remove 0x prefix and function selector (if present)
      const data = hex.startsWith('0x') ? hex.slice(2) : hex;
      const offset = parseInt(data.slice(0, 64), 16) * 2;
      const length = parseInt(data.slice(offset, offset + 64), 16) * 2;
      const stringHex = data.slice(offset + 64, offset + 64 + length);
      return Buffer.from(stringHex, 'hex').toString('utf8').replace(/\x00/g, '');
    } catch {
      return '';
    }
  }

  private static decodeUint8(hex: string): number {
    try {
      const data = hex.startsWith('0x') ? hex.slice(2) : hex;
      return parseInt(data, 16);
    } catch {
      return 0;
    }
  }
}
