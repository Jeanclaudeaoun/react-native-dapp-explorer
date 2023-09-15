import * as React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import Web3View from 'react-native-web3view';

import Web3 from 'web3';
const web3 = new Web3(window.ethereum);
const accounts = await web3.eth.getAccounts();

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.paragraph}>WebView below:</Text>
      <Web3View
        provider={web3.currentProvider}
        address={accounts[0]}
        url="https://your-dapp-url.com"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: '10px',
    backgroundColor: '#ecf0f1',
    padding: 8,
  },
  paragraph: {
    margin: 24,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});