import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  TextInput,
  BackHandler,
  Platform,
  Alert,
  Linking
} from 'react-native';
import { WebViewBridge } from '../src/webview-bridge';
import { NavigationManager } from '../src/navigation-manager';
import { DeepLinkManager } from '../src/deep-link-manager';
import { StateManager } from '../src/state-manager';
import { DAppBrowserErrorBoundary } from '../src/error-boundary';
import Web3View from '../src';

const INITIAL_URL = 'https://app.solana.com';
const TRUSTED_DOMAINS = [
  'app.solana.com',
  'jupiter.ag',
  'orca.so',
  'magiceden.io',
  'phantom.app'
];

export const EnhancedSolanaDAppBrowser = ({ wallet }) => {
  const [url, setUrl] = useState(INITIAL_URL);
  const [urlInput, setUrlInput] = useState(INITIAL_URL);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transactionInProgress, setTransactionInProgress] = useState(false);

  const webViewRef = useRef(null);
  const bridge = useRef(new WebViewBridge());
  const navigationManager = useRef(new NavigationManager({ trustedDomains: TRUSTED_DOMAINS }));
  const deepLinkManager = useRef(new DeepLinkManager({
    schemes: ['solana', 'phantom'],
    debug: __DEV__
  }));
  const stateManager = useRef(new StateManager());

  // Initialize state manager
  useEffect(() => {
    stateManager.current.initialize();
  }, []);

  // Handle Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack) {
        handleGoBack();
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [canGoBack]);

  // Handle deep links
  useEffect(() => {
    const handleDeepLink = ({ url: deepLinkUrl }) => {
      deepLinkManager.current.handleUrl(deepLinkUrl);
    };

    // Handle deep links when app is already running
    Linking.addEventListener('url', handleDeepLink);

    // Handle deep links that launched the app
    Linking.getInitialURL().then(initialUrl => {
      if (initialUrl) {
        deepLinkManager.current.handleUrl(initialUrl);
      }
    });

    return () => {
      // Cleanup deep link listener
      if (Platform.OS !== 'ios') {
        Linking.removeEventListener('url', handleDeepLink);
      }
    };
  }, []);

  const handleUrlSubmit = useCallback(() => {
    let finalUrl = urlInput;
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }
    setUrl(finalUrl);
    stateManager.current.addToHistory(finalUrl);
  }, [urlInput]);

  const handleGoBack = useCallback(() => {
    if (webViewRef.current) {
      webViewRef.current.goBack();
    }
  }, []);

  const handleGoForward = useCallback(() => {
    if (webViewRef.current) {
      webViewRef.current.goForward();
    }
  }, []);

  const handleNavigationStateChange = useCallback((navState) => {
    const { canGoBack, canGoForward, url } = navState;
    setCanGoBack(canGoBack);
    setCanGoForward(canGoForward);
    setUrlInput(url);
  }, []);

  const handleTransactionStart = useCallback((tx) => {
    setTransactionInProgress(true);
    console.log('Transaction started:', tx);
  }, []);

  const handleTransactionComplete = useCallback((signature, success) => {
    setTransactionInProgress(false);
    
    // Add to recent transactions
    stateManager.current.addTransaction({
      signature,
      timestamp: Date.now(),
      status: success ? 'success' : 'error',
      domain: new URL(url).hostname
    });

    if (success) {
      const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=${wallet.cluster}`;
      Alert.alert(
        'Transaction Complete',
        'View in Solana Explorer?',
        [
          {
            text: 'View',
            onPress: () => setUrl(explorerUrl)
          },
          { text: 'Close', style: 'cancel' }
        ]
      );
    } else {
      Alert.alert('Transaction Failed', 'The transaction could not be completed.');
    }
  }, [url, wallet.cluster]);

  const handleRetry = useCallback(() => {
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  }, []);

  return (
    <DAppBrowserErrorBoundary url={url} onRetry={handleRetry}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.navigationBar}>
            <TouchableOpacity 
              onPress={handleGoBack}
              style={[styles.navButton, !canGoBack && styles.disabledButton]}
              disabled={!canGoBack}
            >
              <Text style={styles.navButtonText}>←</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={handleGoForward}
              style={[styles.navButton, !canGoForward && styles.disabledButton]}
              disabled={!canGoForward}
            >
              <Text style={styles.navButtonText}>→</Text>
            </TouchableOpacity>

            <View style={styles.urlBar}>
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
                clearButtonMode="while-editing"
              />
              {loading && (
                <View style={styles.loadingIndicator} />
              )}
            </View>
          </View>
        </View>

        <Web3View
          ref={webViewRef}
          provider={{}} // Empty EVM provider since we're only using Solana
          solanaProvider={{
            getPublicKey: async () => wallet.publicKey,
            getCluster: async () => wallet.cluster,
            signTransaction: wallet.signTransaction,
            signAllTransactions: wallet.signAllTransactions,
            signMessage: wallet.signMessage
          }}
          url={url}
          chainId={1} // Required but not used for Solana
          style={styles.webview}
          onNavigationStateChange={handleNavigationStateChange}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onSolanaTransactionStart={handleTransactionStart}
          onSolanaTransactionComplete={handleTransactionComplete}
          onError={(error) => {
            console.error('DApp Browser Error:', error);
            Alert.alert('Error', error.message);
          }}
          trustedDomains={TRUSTED_DOMAINS}
        />

        {transactionInProgress && (
          <View style={styles.transactionOverlay}>
            <View style={styles.transactionDialog}>
              <Text style={styles.transactionText}>
                Transaction in Progress...
              </Text>
            </View>
          </View>
        )}
      </View>
    </DAppBrowserErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#f5f5f5',
    paddingTop: Platform.OS === 'ios' ? 44 : 0,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  navigationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  navButton: {
    padding: 8,
    marginHorizontal: 4,
  },
  navButtonText: {
    fontSize: 20,
    color: '#007AFF',
  },
  disabledButton: {
    opacity: 0.5,
  },
  urlBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginHorizontal: 8,
    paddingHorizontal: 8,
  },
  urlInput: {
    flex: 1,
    height: 36,
    fontSize: 16,
    color: '#000',
  },
  loadingIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#007AFF',
    marginRight: 8,
  },
  webview: {
    flex: 1,
  },
  transactionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionDialog: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  transactionText: {
    fontSize: 16,
    color: '#000',
    textAlign: 'center',
  },
});
