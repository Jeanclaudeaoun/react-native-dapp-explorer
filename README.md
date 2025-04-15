# React Native DApp Explorer

A lightweight Web3-enabled WebView component for React Native that supports both EVM (Ethereum) and Solana wallets. Drop-in replacement for react-native-webview with built-in wallet provider injection.

## Installation

### React Native CLI
```bash
npm install react-native-dapp-explorer
# or
yarn add react-native-dapp-explorer
```

### Expo
```bash
npx expo install react-native-dapp-explorer react-native-webview
```

## Usage Examples

### 1. Using with ethers.js Private Key Wallet
```typescript
import { Web3View } from 'react-native-dapp-explorer';
import { ethers } from 'ethers';

const wallet = new ethers.Wallet(
  'YOUR_PRIVATE_KEY',
  new ethers.JsonRpcProvider('YOUR_RPC_URL')
);

const ethProvider = {
  getAddress: async () => wallet.address,
  getChainId: async () => 1, // mainnet
  signMessage: async (message) => wallet.signMessage(message),
  sendTransaction: async (tx) => {
    const response = await wallet.sendTransaction(tx);
    return response.hash;
  }
};

export const DAppBrowser = () => (
  <Web3View
    url="https://app.uniswap.org"
    ethProvider={ethProvider}
    trustedDomains={['app.uniswap.org']}
  />
);
```

### 2. Using with wagmi
```typescript
import { Web3View } from 'react-native-dapp-explorer';
import { useAccount, useNetwork, useSignMessage, useSendTransaction } from 'wagmi';

const WagmiExample = () => {
  const { address } = useAccount();
  const { chain } = useNetwork();
  const { signMessage } = useSignMessage();
  const { sendTransaction } = useSendTransaction();

  const ethProvider = {
    getAddress: async () => address || '',
    getChainId: async () => chain?.id || 1,
    signMessage: async (message) => {
      const result = await signMessage({ message });
      return result;
    },
    sendTransaction: async (tx) => {
      const result = await sendTransaction({ ...tx });
      return result.hash;
    }
  };

  return (
    <Web3View
      url="https://app.uniswap.org"
      ethProvider={ethProvider}
      trustedDomains={['app.uniswap.org']}
    />
  );
};
```

### 3. Using with Solana Private Key Wallet
```typescript
import { Web3View } from 'react-native-dapp-explorer';
import { Keypair, Transaction } from '@solana/web3.js';
import * as bs58 from 'bs58';

const keypair = Keypair.fromSecretKey(bs58.decode('YOUR_PRIVATE_KEY'));

const solanaProvider = {
  getPublicKey: async () => keypair.publicKey.toBase58(),
  getCluster: async () => 'mainnet-beta',
  signTransaction: async (serializedTx) => {
    const tx = Transaction.from(Buffer.from(serializedTx, 'base64'));
    tx.partialSign(keypair);
    return Buffer.from(tx.serialize()).toString('base64');
  },
  signMessage: async (message) => {
    const messageBytes = typeof message === 'string' 
      ? new TextEncoder().encode(message)
      : message;
    const signature = keypair.sign(messageBytes);
    return Buffer.from(signature).toString('base64');
  }
};

export const SolanaDAppBrowser = () => (
  <Web3View
    url="https://jupiter.exchange"
    solanaProvider={solanaProvider}
    trustedDomains={['jupiter.exchange']}
  />
);
```

### 4. Using with Solana Wallet Adapter
```typescript
import { Web3View } from 'react-native-dapp-explorer';
import { useWallet } from '@solana/wallet-adapter-react';
import { Transaction } from '@solana/web3.js';

const SolanaWalletKitExample = () => {
  const wallet = useWallet();

  const solanaProvider = {
    getPublicKey: async () => wallet.publicKey?.toBase58() || '',
    getCluster: async () => 'mainnet-beta',
    signTransaction: async (serializedTx) => {
      const tx = Transaction.from(Buffer.from(serializedTx, 'base64'));
      const signedTx = await wallet.signTransaction(tx);
      return Buffer.from(signedTx.serialize()).toString('base64');
    },
    signMessage: async (message) => {
      const messageBytes = typeof message === 'string' 
        ? new TextEncoder().encode(message)
        : message;
      const signature = await wallet.signMessage(messageBytes);
      return Buffer.from(signature).toString('base64');
    }
  };

  return (
    <Web3View
      url="https://jupiter.exchange"
      solanaProvider={solanaProvider}
      trustedDomains={['jupiter.exchange']}
    />
  );
};
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| url | string | The URL to load in the WebView |
| ethProvider? | EthereumProvider | Ethereum wallet provider implementation |
| solanaProvider? | SolanaProvider | Solana wallet provider implementation |
| trustedDomains? | string[] | List of allowed domains |
| onError? | (error: Error) => void | Error handler callback |
| ...props | WebViewProps | Any valid react-native-webview props |

## Provider Interfaces

### EthereumProvider
```typescript
interface EthereumProvider {
  getAddress(): Promise<string>;
  getChainId(): Promise<number>;
  signMessage(message: string): Promise<string>;
  signTypedData?(data: any): Promise<string>;
  sendTransaction(tx: any): Promise<string>;
}
```

### SolanaProvider
```typescript
interface SolanaProvider {
  getPublicKey(): Promise<string>;
  getCluster(): Promise<'mainnet-beta' | 'testnet' | 'devnet'>;
  signTransaction(transaction: string): Promise<string>;
  signAllTransactions(transactions: string[]): Promise<string[]>;
  signMessage(message: Uint8Array | string): Promise<string>;
}
```

## Security

The Web3View component includes built-in security features:
- Domain allowlist through trustedDomains prop
- Transaction validation before signing
- Base64 transaction serialization
- No auto-injection on untrusted domains

## License

MIT
