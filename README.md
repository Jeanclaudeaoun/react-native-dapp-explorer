# React Native DApp Explorer

A simple WebView-based DApp browser for React Native wallet apps. Drop this component into your wallet app and instantly support any Web3 DApp!

## Installation

```bash
npm install react-native-dapp-explorer react-native-webview
# or
yarn add react-native-dapp-explorer react-native-webview
```

## Quick Start

```typescript
import Web3View from 'react-native-dapp-explorer';

function DAppBrowser() {
  // Your wallet's provider
  const provider = {
    getAddress: () => wallet.address,
    getChainId: () => wallet.chainId,
    signMessage: (msg) => wallet.signMessage(msg),
    sendTransaction: (tx) => wallet.sendTransaction(tx),
  };

  return (
    <Web3View
      provider={provider}
      url="https://app.uniswap.org"
      chainId={1}
      style={{ flex: 1 }}
      onTransactionStart={tx => {
        // Show transaction confirmation UI
      }}
      onTransactionComplete={(hash, success, explorerUrl) => {
        // Transaction finished - show result to user
      }}
    />
  );
}
```

## Wallet Integration

### 1. Basic Wallet Integration

Just implement these 4 required methods:

```typescript
const provider = {
  getAddress: () => "0x...", // Return wallet address
  getChainId: () => 1,       // Return current chain ID
  signMessage: (msg) => {},  // Sign messages
  sendTransaction: (tx) => {} // Send transactions
};
```

### 2. WalletConnect Integration

Works seamlessly with WalletConnect v2:

```typescript
import { SignClient } from '@walletconnect/sign-client';

const provider = {
  getAddress: () => session.address,
  getChainId: () => session.chainId,
  signMessage: (message) => 
    signClient.request({
      topic: session.topic,
      request: {
        method: 'personal_sign',
        params: [message]
      }
    }),
  sendTransaction: (tx) =>
    signClient.request({
      topic: session.topic,
      request: {
        method: 'eth_sendTransaction',
        params: [tx]
      }
    })
};
```

### 3. Multi-Chain Support

Handles chain switching automatically:

```typescript
<Web3View
  provider={provider}
  chainId={chainId}
  onChainChanged={async (newChainId) => {
    // Switch chains in your wallet
    await wallet.switchChain(newChainId);
  }}
/>
```

## Features

- ⚡️ Zero configuration required
- 🔒 Secure by default
- 🌐 Multi-chain support out of the box
- 📱 Native mobile UX
- 🤝 WalletConnect ready
- 🔍 Built-in transaction error handling
- 🔗 Block explorer integration

## Common Use Cases

### 1. Show Transaction Details

```typescript
<Web3View
  onTransactionStart={(tx) => {
    Alert.alert(
      'Confirm Transaction',
      `Send ${tx.value} to ${tx.to}`
    );
  }}
  onTransactionComplete={(hash, success, explorerUrl) => {
    if (success) {
      Alert.alert(
        'Success',
        `View on Explorer: ${explorerUrl}`
      );
    }
  }}
/>
```

### 2. Handle Signing Requests

```typescript
<Web3View
  onSignMessage={(message) => {
    Alert.alert(
      'Sign Message',
      `Message: ${message}`
    );
  }}
  onSignComplete={(signature) => {
    console.log('Signed:', signature);
  }}
/>
```

### 3. Security Options

```typescript
<Web3View
  trustedDomains={[
    'app.uniswap.org',
    'app.1inch.io'
  ]}
  allowedMethods={[
    'eth_sendTransaction',
    'personal_sign'
  ]}
/>
```

## Supported Chains

Pre-configured support for:
- Ethereum Mainnet
- Polygon
- BNB Smart Chain
- And more...

## API Reference

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| provider | WalletProvider | Yes | Your wallet's Web3 provider |
| url | string | Yes | DApp URL to load |
| chainId | number | Yes | Current chain ID |
| onTransactionStart | function | No | Called when tx requested |
| onTransactionComplete | function | No | Called when tx done |
| onSignMessage | function | No | Called when signing requested |
| onError | function | No | Called on any error |
| style | ViewStyle | No | Container styles |

See [example](./example) for complete implementation.
