import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import Web3View from '../src';
import { TransactionRequest } from '../src/types';
import { SecurityUtils } from '../src/security-utils';
import { AssetUtils } from '../src/asset-utils';
import { TransactionUtils } from '../src/transaction-utils';

// This is a complete example showing how to integrate the DApp browser
// with security features and transaction monitoring
export const SecureWalletExample = () => {
  const [currentUrl, setCurrentUrl] = useState('https://app.uniswap.org');

  // Your wallet's provider implementation
  const provider = {
    // ... implement required methods
    getAddress: async () => '0x123...',
    getChainId: async () => 1,
    signMessage: async (message: string) => '0x...',
    sendTransaction: async (tx: TransactionRequest) => '0x...',
  };

  const handleTransaction = useCallback(async (tx: TransactionRequest) => {
    try {
      // 1. Security Analysis
      const warnings = await SecurityUtils.analyzeTransaction(provider, tx);
      if (warnings.length > 0) {
        const highRiskWarnings = warnings.filter(w => w.type === 'HIGH');
        if (highRiskWarnings.length > 0) {
          const proceed = await new Promise(resolve => {
            Alert.alert(
              'Security Warning',
              highRiskWarnings[0].message + '\n' + highRiskWarnings[0].details,
              [
                { text: 'Cancel', onPress: () => resolve(false) },
                { text: 'Proceed Anyway', onPress: () => resolve(true) }
              ]
            );
          });
          if (!proceed) throw new Error('User rejected transaction');
        }
      }

      // 2. Token Detection
      if (tx.to) {
        const tokenInfo = await AssetUtils.getTokenInfo(provider, tx.to);
        if (tokenInfo.type !== 'UNKNOWN') {
          console.log('Interacting with token:', tokenInfo);
        }
      }

      // 3. Gas Estimation
      const gasEstimate = await TransactionUtils.estimateGas(provider, tx);
      const finalTx = { ...tx, ...gasEstimate };

      // 4. Send Transaction
      const hash = await provider.sendTransaction(finalTx);

      // 5. Monitor Transaction
      TransactionUtils.monitorTransaction(provider, hash, (status) => {
        if (status.status === 'success') {
          Alert.alert('Success', `Transaction confirmed with ${status.confirmations} confirmations`);
        } else if (status.status === 'failed') {
          Alert.alert('Failed', 'Transaction failed to execute');
        }
      });

      return hash;
    } catch (error: any) {
      Alert.alert('Error', error.message);
      throw error;
    }
  }, [provider]);

  const handleSignMessage = useCallback(async (message: string) => {
    // Check for security concerns in signature requests
    const warnings = SecurityUtils.validateSignRequest(message);
    if (warnings.length > 0) {
      Alert.alert('Warning', warnings[0].message + '\n' + warnings[0].details);
    }

    return provider.signMessage(message);
  }, [provider]);

  // Check domain security when URL changes
  const handleUrlChange = useCallback(async (url: string) => {
    const warnings = await SecurityUtils.analyzeDappDomain(url);
    if (warnings.length > 0) {
      Alert.alert('Security Warning', warnings[0].message);
    }
    setCurrentUrl(url);
  }, []);

  return (
    <View style={styles.container}>
      <Web3View
        provider={provider}
        url={currentUrl}
        chainId={1}
        style={styles.webview}
        onTransactionStart={handleTransaction}
        onSignMessage={handleSignMessage}
        onError={(error) => Alert.alert('Error', error.toString())}
        trustedDomains={[
          'app.uniswap.org',
          'app.1inch.io',
          'app.aave.com'
        ]}
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
