# React Native DApp Explorer

A Web3-enabled WebView component for React Native wallet apps supporting both EVM (Ethereum) and Solana chains.

## Features

- Full EVM (Ethereum) support with MetaMask-compatible provider
- Solana support with Phantom-compatible provider
- Secure transaction signing
- Message signing support
- Multi-chain compatibility
- TypeScript support
- Extensive security features

## Installation

```bash
npm install react-native-dapp-explorer
# or
yarn add react-native-dapp-explorer
```

## Usage

### Basic Usage with Solana Support

```typescript
import Web3View from 'react-native-dapp-explorer';

const MyDAppBrowser = () => {
  const solanaProvider = {
    getPublicKey: async () => 'your-solana-public-key',
    getCluster: async () => 'mainnet-beta',
    signTransaction: async (tx) => {
      // Your transaction signing logic
      return signedTransaction;
    },
    signAllTransactions: async (txs) => {
      // Your batch transaction signing logic
      return signedTransactions;
    },
    signMessage: async (message) => {
      // Your message signing logic
      return signature;
    }
  };

  return (
    <Web3View
      provider={evmProvider} // Your existing EVM provider
      solanaProvider={solanaProvider}
      url="https://your-dapp-url.com"
      chainId={1}
      onSolanaTransactionStart={tx => console.log('Solana transaction started', tx)}
      onSolanaTransactionComplete={(signature, success) => 
        console.log('Solana transaction completed', signature, success)}
      onSolanaSignMessage={message => console.log('Signing Solana message', message)}
    />
  );
};
```

### Provider Interface

#### Solana Provider
```typescript
interface SolanaProvider {
  getPublicKey(): Promise<string>;
  getCluster(): Promise<'mainnet-beta' | 'testnet' | 'devnet'>;
  signTransaction(transaction: any): Promise<string>;
  signAllTransactions(transactions: any[]): Promise<string[]>;
  signMessage(message: any): Promise<string>;
}
```

## Security Features

The DApp browser includes comprehensive security features for both EVM and Solana transactions:

- Domain allowlist
- Transaction validation
- Signature request validation
- Program ID validation (Solana)
- Malicious pattern detection

## Events

### Solana-specific Events
- `onSolanaTransactionStart`: Called when a transaction signing is requested
- `onSolanaTransactionComplete`: Called when transaction signing is complete
- `onSolanaSignMessage`: Called when message signing is requested
