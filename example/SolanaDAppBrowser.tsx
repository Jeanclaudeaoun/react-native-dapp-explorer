import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Text,
  Alert,
  Platform,
  SafeAreaView,
} from 'react-native';
import Web3View from '../src';
import { Connection, Transaction, PublicKey } from '@solana/web3.js';
import * as bs58 from 'bs58';
import { Buffer } from 'buffer';

interface SolanaDAppBrowserProps {
  initialUrl?: string;
  wallet: {
    publicKey: string;
    cluster: 'mainnet-beta' | 'testnet' | 'devnet';
    signTransaction: (transaction: Transaction) => Promise<Transaction>;
    signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
    signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  };
}

const TRUSTED_DOMAINS = [
  'app.solana.com',
  'app.phantom.app',
  'jupiter.ag',
  'orca.so',
  'magiceden.io',
];

export const SolanaDAppBrowser: React.FC<SolanaDAppBrowserProps> = ({ 
  initialUrl = 'https://app.solana.com',
  wallet 
}) => {
  const [url, setUrl] = useState(initialUrl);
  const [urlInput, setUrlInput] = useState(initialUrl);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(false);
  const webViewRef = useRef(null);

  const solanaProvider = {
    getPublicKey: async () => wallet.publicKey,
    getCluster: async () => wallet.cluster,
    signTransaction: async (serializedTx: string) => {
      try {
        // Decode the serialized transaction
        const tx = Transaction.from(Buffer.from(serializedTx, 'base64'));
        
        // Sign the transaction
        const signedTx = await wallet.signTransaction(tx);
        
        // Return base64 encoded signed transaction
        return Buffer.from(signedTx.serialize()).toString('base64');
      } catch (error) {
        console.error('Error signing transaction:', error);
        throw error;
      }
    },
    signAllTransactions: async (serializedTxs: string[]) => {
      try {
        // Decode the serialized transactions
        const txs = serializedTxs.map(serializedTx => 
          Transaction.from(Buffer.from(serializedTx, 'base64'))
        );
        
        // Sign all transactions
        const signedTxs = await wallet.signAllTransactions(txs);
        
        // Return base64 encoded signed transactions
        return signedTxs.map(tx => 
          Buffer.from(tx.serialize()).toString('base64')
        );
      } catch (error) {
        console.error('Error signing transactions:', error);
        throw error;
      }
    },
    signMessage: async (message: string) => {
      try {
        // Convert message to Uint8Array if it's a string
        const messageBytes = typeof message === 'string' 
          ? new TextEncoder().encode(message)
          : message;
        
        // Sign the message
        const signature = await wallet.signMessage(messageBytes);
        
        // Return base58 encoded signature
        return bs58.encode(signature);
      } catch (error) {
        console.error('Error signing message:', error);
        throw error;
      }
    }
  };

  const handleNavigationStateChange = useCallback(({ canGoBack, url }) => {
    setCanGoBack(canGoBack);
    setUrl(url);
    setUrlInput(url);
  }, []);

  const handleUrlSubmit = useCallback(() => {
    let finalUrl = urlInput;
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }
    setUrl(finalUrl);
  }, [urlInput]);

  const handleGoBack = useCallback(() => {
    if (webViewRef.current) {
      webViewRef.current.goBack();
    }
  }, []);

  const handleTransactionStart = useCallback((tx: any) => {
    setLoading(true);
    console.log('Transaction started:', tx);
  }, []);

  const handleTransactionComplete = useCallback((signature: string, success: boolean) => {
    setLoading(false);
    if (success) {
      const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=${wallet.cluster}`;
      Alert.alert(
        'Transaction Complete',
        'View in Solana Explorer?',
        [
          {
            text: 'View',
            onPress: () => {
              setUrl(explorerUrl);
            },
          },
          { text: 'Close', style: 'cancel' },
        ]
      );
    } else {
      Alert.alert('Transaction Failed', 'The transaction could not be completed.');
    }
  }, [wallet.cluster]);

  const handleSignMessage = useCallback((message: any) => {
    console.log('Signing message:', message);
  }, []);

  const handleError = useCallback((error: Error) => {
    Alert.alert('Error', error.message);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.urlBar}>
          {canGoBack && (
            <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
          )}
          <TextInput
            style={styles.urlInput}
            value={urlInput}
            onChangeText={setUrlInput}
            onSubmitEditing={handleUrlSubmit}
            placeholder="Enter URL"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="go"
          />
        </View>
      </View>
      
      <Web3View
        ref={webViewRef}
        provider={{}} // Empty provider since we're only using Solana
        solanaProvider={solanaProvider}
        url={url}
        chainId={1} // Not used for Solana but required by the interface
        style={styles.webview}
        onNavigationStateChange={handleNavigationStateChange}
        onSolanaTransactionStart={handleTransactionStart}
        onSolanaTransactionComplete={handleTransactionComplete}
        onSolanaSignMessage={handleSignMessage}
        onError={handleError}
        trustedDomains={TRUSTED_DOMAINS}
      />
      
      {loading && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Processing Transaction...</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  urlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  backButton: {
    padding: 8,
    marginRight: 4,
  },
  backButtonText: {
    fontSize: 20,
    color: '#007AFF',
  },
  urlInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#000',
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 8,
  },
});
