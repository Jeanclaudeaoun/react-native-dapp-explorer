export interface Chain {
  name: string;
  chainId: number;
  shortName: string;
  networkId: number;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpc: string[];
  explorers?: { name: string; url: string; standard: string }[];
}

export const chains: { [key: number]: Chain } = {
  1: {
    name: 'Ethereum Mainnet',
    chainId: 1,
    shortName: 'eth',
    networkId: 1,
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpc: ['https://eth.llamarpc.com', 'https://cloudflare-eth.com'],
    explorers: [
      {
        name: 'etherscan',
        url: 'https://etherscan.io',
        standard: 'EIP3091'
      }
    ]
  },
  137: {
    name: 'Polygon Mainnet',
    chainId: 137,
    shortName: 'matic',
    networkId: 137,
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18,
    },
    rpc: ['https://polygon-rpc.com'],
    explorers: [
      {
        name: 'polygonscan',
        url: 'https://polygonscan.com',
        standard: 'EIP3091'
      }
    ]
  },
  56: {
    name: 'BNB Smart Chain',
    chainId: 56,
    shortName: 'bnb',
    networkId: 56,
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18,
    },
    rpc: ['https://bsc-dataseed.binance.org'],
    explorers: [
      {
        name: 'bscscan',
        url: 'https://bscscan.com',
        standard: 'EIP3091'
      }
    ]
  },
  // Add more chains as needed
};
