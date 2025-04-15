import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Web3View } from 'react-native-dapp-explorer';
import { Keypair, Connection, Transaction } from '@solana/web3.js';
import * as bs58 from 'bs58';

const SolanaPrivateKeyExample = () => {
  const [url] = useState('https://jupiter.exchange');
  
  // Create a wallet from private key
  const privateKey = 'YOUR_PRIVATE_KEY'; // Replace with base58 encoded private key
  const keypair = Keypair.fromSecretKey(bs58.decode(privateKey));
  const connection = new Connection('https://api.mainnet-beta.solana.com');

  const solanaProvider = {
    getPublicKey: async () => keypair.publicKey.toBase58(),
    getCluster: async () => 'mainnet-beta' as const,
    signTransaction: async (serializedTx: string) => {
      const tx = Transaction.from(Buffer.from(serializedTx, 'base64'));
      tx.partialSign(keypair);
      return Buffer.from(tx.serialize()).toString('base64');
    },
    signAllTransactions: async (serializedTxs: string[]) => {
      return serializedTxs.map(tx => {
        const transaction = Transaction.from(Buffer.from(tx, 'base64'));
        transaction.partialSign(keypair);
        return Buffer.from(transaction.serialize()).toString('base64');
      });
    },
    signMessage: async (message: Uint8Array | string) => {
      const messageBytes = typeof message === 'string' 
        ? new TextEncoder().encode(message)
        : message;
      const signature = keypair.sign(messageBytes);
      return Buffer.from(signature).toString('base64');
    }
  };

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

export default SolanaPrivateKeyExample;
