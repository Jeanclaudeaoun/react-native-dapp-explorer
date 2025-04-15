import React, { useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import Web3View from '../src';
import { Connection, Transaction } from '@solana/web3.js';

interface SolanaWalletExampleProps {
  solanaWallet: {
    publicKey: string;
    cluster: 'mainnet-beta' | 'testnet' | 'devnet';
    signTransaction: (transaction: Transaction) => Promise<Transaction>;
    signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
    signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  };
}

export const SolanaWalletExample: React.FC<SolanaWalletExampleProps> = ({
  solanaWallet
}) => {
  const solanaProvider = {
    getPublicKey: async () => solanaWallet.publicKey,
    getCluster: async () => solanaWallet.cluster,
    signTransaction: async (tx: Transaction) => {
      try {
        const signedTx = await solanaWallet.signTransaction(tx);
        return signedTx.serialize().toString('base64');
      } catch (error) {
        console.error('Failed to sign Solana transaction:', error);
        throw error;
      }
    },
    signAllTransactions: async (txs: Transaction[]) => {
      try {
        const signedTxs = await solanaWallet.signAllTransactions(txs);
        return signedTxs.map(tx => tx.serialize().toString('base64'));
      } catch (error) {
        console.error('Failed to sign Solana transactions:', error);
        throw error;
      }
    },
    signMessage: async (message: Uint8Array) => {
      try {
        const signature = await solanaWallet.signMessage(message);
        return Buffer.from(signature).toString('base64');
      } catch (error) {
        console.error('Failed to sign Solana message:', error);
        throw error;
      }
    }
  };

  const handleSolanaTransaction = useCallback((tx: any) => {
    Alert.alert('Solana Transaction', 'Transaction requested from DApp');
  }, []);

  const handleSolanaSignature = useCallback((message: any) => {
    Alert.alert('Solana Signature', 'Message signing requested from DApp');
  }, []);

  return (
    <View style={styles.container}>
      <Web3View
        provider={{} as any} // Empty EVM provider since we're only using Solana
        solanaProvider={solanaProvider}
        url="https://app.solana.com" // Example Solana DApp URL
        chainId={1} // Required but not used for Solana
        style={styles.webview}
        onSolanaTransactionStart={handleSolanaTransaction}
        onSolanaSignMessage={handleSolanaSignature}
        onError={error => Alert.alert('Error', error.toString())}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});
