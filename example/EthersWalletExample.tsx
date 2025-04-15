import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Web3View } from 'react-native-dapp-explorer';
import { ethers } from 'ethers';

const EthersWalletExample = () => {
  const [url] = useState('https://app.uniswap.org');
  
  // Create a wallet from private key
  const wallet = new ethers.Wallet(
    'YOUR_PRIVATE_KEY', // Replace with your private key
    new ethers.JsonRpcProvider('https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY')
  );

  const ethProvider = {
    getAddress: async () => wallet.address,
    getChainId: async () => 1, // mainnet
    signMessage: async (message: string) => wallet.signMessage(message),
    sendTransaction: async (tx: any) => {
      const response = await wallet.sendTransaction(tx);
      return response.hash;
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

export default EthersWalletExample;
