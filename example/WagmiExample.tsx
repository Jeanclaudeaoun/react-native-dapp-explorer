import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Web3View } from 'react-native-dapp-explorer';
import { useAccount, useNetwork, useSignMessage, useSendTransaction } from 'wagmi';

const WagmiExample = () => {
  const [url] = useState('https://app.uniswap.org');
  
  const { address } = useAccount();
  const { chain } = useNetwork();
  const { signMessage } = useSignMessage();
  const { sendTransaction } = useSendTransaction();

  const ethProvider = {
    getAddress: async () => address || '',
    getChainId: async () => chain?.id || 1,
    signMessage: async (message: string) => {
      const result = await signMessage({ message });
      return result;
    },
    sendTransaction: async (tx: any) => {
      const result = await sendTransaction({ ...tx });
      return result.hash;
    }
  };

  return (
    <View style={styles.container}>
      <Web3View
        url={url}
        ethProvider={ethProvider}
        trustedDomains={['app.uniswap.org']}
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

export default WagmiExample;
