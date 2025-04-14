import React, { useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import Web3View from 'react-native-dapp-explorer';
import { SignClient } from '@walletconnect/sign-client';
import { Web3Modal } from '@web3modal/standalone';

interface WalletConnectExampleProps {
  signClient: SignClient;
  web3Modal: Web3Modal;
  session: any; // WalletConnect session
}

export const WalletConnectExample: React.FC<WalletConnectExampleProps> = ({
  signClient,
  web3Modal,
  session
}) => {
  const handleTransaction = useCallback(async (tx: any) => {
    try {
      const result = await signClient.request({
        topic: session.topic,
        chainId: `eip155:${tx.chainId || 1}`,
        request: {
          method: 'eth_sendTransaction',
          params: [tx],
        },
      });
      return result;
    } catch (error: any) {
      console.error('Transaction failed:', error);
      throw error;
    }
  }, [signClient, session]);

  const handleSignMessage = useCallback(async (message: string) => {
    try {
      const result = await signClient.request({
        topic: session.topic,
        chainId: 'eip155:1',
        request: {
          method: 'personal_sign',
          params: [message, session.address],
        },
      });
      return result;
    } catch (error: any) {
      console.error('Signing failed:', error);
      throw error;
    }
  }, [signClient, session]);

  const provider = {
    getAddress: async () => session.address,
    getChainId: async () => parseInt(session.chainId.split(':')[1]),
    signMessage: handleSignMessage,
    sendTransaction: handleTransaction,
  };

  return (
    <View style={styles.container}>
      <Web3View
        provider={provider}
        url="https://app.uniswap.org"
        chainId={1}
        style={styles.webview}
        onTransactionStart={() => Alert.alert('Confirm', 'Please check your wallet')}
        onTransactionComplete={(hash, success, explorerUrl) => {
          Alert.alert(
            success ? 'Success' : 'Failed',
            success ? `Transaction confirmed: ${hash}` : 'Transaction failed'
          );
        }}
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
