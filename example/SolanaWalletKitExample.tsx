import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Web3View } from 'react-native-dapp-explorer';
import { useWallet } from '@solana/wallet-adapter-react';
import { Transaction } from '@solana/web3.js';

const SolanaWalletKitExample = () => {
  const [url] = useState('https://jupiter.exchange');
  const wallet = useWallet();

  const solanaProvider = {
    getPublicKey: async () => wallet.publicKey?.toBase58() || '',
    getCluster: async () => 'mainnet-beta' as const,
    signTransaction: async (serializedTx: string) => {
      if (!wallet.signTransaction) {
        throw new Error('Wallet does not support signing');
      }
      const tx = Transaction.from(Buffer.from(serializedTx, 'base64'));
      const signedTx = await wallet.signTransaction(tx);
      return Buffer.from(signedTx.serialize()).toString('base64');
    },
    signAllTransactions: async (serializedTxs: string[]) => {
      if (!wallet.signAllTransactions) {
        throw new Error('Wallet does not support batch signing');
      }
      const txs = serializedTxs.map(tx => 
        Transaction.from(Buffer.from(tx, 'base64'))
      );
      const signedTxs = await wallet.signAllTransactions(txs);
      return signedTxs.map(tx => 
        Buffer.from(tx.serialize()).toString('base64')
      );
    },
    signMessage: async (message: Uint8Array | string) => {
      if (!wallet.signMessage) {
        throw new Error('Wallet does not support message signing');
      }
      const messageBytes = typeof message === 'string' 
        ? new TextEncoder().encode(message)
        : message;
      const signature = await wallet.signMessage(messageBytes);
      return Buffer.from(signature).toString('base64');
    }
  };

  if (!wallet.connected) {
    return null; // Or show a connect wallet UI
  }

  return (
    <View style={styles.container}>
      <Web3View
        url={url}
        solanaProvider={solanaProvider}
        trustedDomains={['jupiter.exchange']}
        onError={console.error}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default SolanaWalletKitExample;
