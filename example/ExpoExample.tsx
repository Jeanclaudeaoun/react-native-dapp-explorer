import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Web3View } from 'react-native-dapp-explorer';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAccount, useNetwork, useSignMessage } from 'wagmi';

export default function ExpoExample() {
  const [url, setUrl] = useState('https://app.uniswap.org');
  
  // Wagmi hooks for EVM
  const { address } = useAccount();
  const { chain } = useNetwork();
  const { signMessage } = useSignMessage();

  // Solana wallet adapter
  const wallet = useWallet();

  const ethProvider = {
    getAddress: async () => address || '',
    getChainId: async () => chain?.id || 1,
    signMessage: async (message: string) => {
      const signature = await signMessage({ message });
      return signature;
    },
    sendTransaction: async (tx: any) => {
      // Implement your transaction sending logic
      return 'tx-hash';
    }
  };

  const solanaProvider = {
    getPublicKey: async () => wallet.publicKey?.toBase58() || '',
    getCluster: async () => 'mainnet-beta' as const,
    signTransaction: async (serializedTx: string) => {
      if (!wallet.signTransaction) throw new Error('Wallet does not support signing');
      // Implement your transaction signing logic
      return serializedTx;
    },
    signAllTransactions: async (serializedTxs: string[]) => {
      if (!wallet.signAllTransactions) throw new Error('Wallet does not support signing');
      // Implement your batch transaction signing logic
      return serializedTxs;
    },
    signMessage: async (message: Uint8Array | string) => {
      if (!wallet.signMessage) throw new Error('Wallet does not support message signing');
      const messageBytes = typeof message === 'string' 
        ? new TextEncoder().encode(message)
        : message;
      const signature = await wallet.signMessage(messageBytes);
      return Buffer.from(signature).toString('base64');
    }
  };

  return (
    <View style={styles.container}>
      <Web3View
        url={url}
        ethProvider={ethProvider}
        solanaProvider={solanaProvider}
        trustedDomains={['app.uniswap.org', 'jupiter.exchange']}
        onError={console.error}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
