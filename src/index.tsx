import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Platform,
  Text,
  TouchableOpacity
} from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent, WebViewNavigation } from 'react-native-webview';
import { DAppManager } from './dapp-manager';
import { DAppBrowserErrorBoundary } from './error-boundary';
import type { SolanaProvider, Web3ViewProps } from './types';

// Default RPC endpoints for each network
const DEFAULT_ENDPOINTS = {
  'mainnet-beta': [
    'https://api.mainnet-beta.solana.com',
    'https://solana-api.projectserum.com'
  ],
  'testnet': [
    'https://api.testnet.solana.com'
  ],
  'devnet': [
    'https://api.devnet.solana.com'
  ]
};

const Web3View: React.FC<Web3ViewProps> = ({
  provider,
  solanaProvider,
  url,
  chainId,
  style,
  onChainChanged,
  onTransactionStart,
  onTransactionHash,
  onTransactionComplete,
  onSignMessage,
  onSignComplete,
  onSolanaTransactionStart,
  onSolanaTransactionComplete,
  onSolanaSignMessage,
  onError,
  trustedDomains = [],
  allowedMethods = [],
  customRpcEndpoints = {},
  ...webViewProps
}) => {
  const webviewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState(url);

  // Initialize DApp manager with merged RPC endpoints
  const dappManager = useRef(new DAppManager({
    endpoints: { ...DEFAULT_ENDPOINTS, ...customRpcEndpoints },
    maxConcurrentRequests: 5,
    cacheSize: 100,
    cacheTTL: 60000, // 1 minute
    healthCheckInterval: 30000 // 30 seconds
  }));

  // Handle navigation state changes
  const handleNavigationStateChange = useCallback((navState: WebViewNavigation) => {
    setCurrentUrl(navState.url);
    
    // Track page load in analytics
    dappManager.current.analyticsManager.trackEvent('pageLoad', {
      url: navState.url,
      title: navState.title,
      loading: navState.loading
    });
  }, []);

  // Initialize providers and handle messages
  useEffect(() => {
    const setupProviders = async () => {
      if (!loading && webviewRef.current) {
        try {
          // Add current domain to trusted domains if not already present
          const domain = new URL(currentUrl).hostname;
          if (trustedDomains.includes(domain)) {
            await dappManager.current.addTrustedDomain(domain);
          }

          // Inject bridge and providers
          const bridgeScript = await dappManager.current.executeRequest(
            'injectBridge',
            async () => {
              // Bridge injection logic here
              return `
                // Bridge injection
                // ...existing bridge code...
              `;
            },
            { bypassCache: true }
          );

          webviewRef.current.injectJavaScript(bridgeScript);

          // Inject Solana provider if available
          if (solanaProvider) {
            const phantomScript = await dappManager.current.executeRequest(
              'injectPhantom',
              async () => {
                // Phantom provider injection logic
                return `
                  // Phantom provider injection
                  // ...existing phantom code...
                `;
              },
              { bypassCache: true }
            );
            webviewRef.current.injectJavaScript(phantomScript);
          }
        } catch (err: any) {
          onError?.(err);
          dappManager.current.analyticsManager.trackEvent('error', {
            type: 'setup',
            error: err.message
          });
        }
      }
    };

    setupProviders();
  }, [loading, currentUrl, solanaProvider, trustedDomains, onError]);

  // Handle messages from WebView
  const handleMessage = useCallback(async (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      const { type, method, params, id } = data;

      // Track request in analytics
      dappManager.current.analyticsManager.trackEvent('request', {
        type,
        method,
        domain: new URL(currentUrl).hostname
      });

      let result;
      let error = null;

      // Execute request with performance optimization and retry logic
      try {
        result = await dappManager.current.executeRequest(
          `${type}-${id}`,
          async () => {
            if (type?.startsWith('solana') && solanaProvider) {
              switch (type) {
                case 'solanaSignTransaction': {
                  const { transaction } = params;
                  onSolanaTransactionStart?.(transaction);
                  const signature = await solanaProvider.signTransaction(transaction);
                  onSolanaTransactionComplete?.(signature, true);
                  return signature;
                }
                // ... other Solana cases ...
              }
            }
            // ... EVM cases ...
          },
          { retry: true }
        );
      } catch (err: any) {
        error = err;
        onError?.(err);
        dappManager.current.analyticsManager.trackEvent('error', {
          type: 'request',
          error: err.message
        });
      }

      // Send response back to WebView
      if (id) {
        const response = error
          ? { id, error: { message: error.message }, jsonrpc: '2.0' }
          : { id, result, jsonrpc: '2.0' };
        
        webviewRef.current?.injectJavaScript(`
          window.bridge.handleResponse(${JSON.stringify(response)});
        `);
      }
    } catch (error: any) {
      console.error('Error handling WebView message:', error);
      onError?.(error);
    }
  }, [currentUrl, solanaProvider, onSolanaTransactionStart, onSolanaTransactionComplete, onError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      dappManager.current.destroy();
    };
  }, []);

  return (
    <DAppBrowserErrorBoundary 
      url={url}
      onRetry={() => {
        if (webviewRef.current) {
          webviewRef.current.reload();
        }
      }}
    >
      <SafeAreaView style={[styles.container, style]}>
        <WebView
          ref={webviewRef}
          source={{ uri: url }}
          style={styles.webview}
          onMessage={handleMessage}
          onNavigationStateChange={handleNavigationStateChange}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            onError?.(new Error(nativeEvent.description));
            dappManager.current.analyticsManager.trackEvent('error', {
              type: 'webview',
              error: nativeEvent.description
            });
          }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          allowsBackForwardNavigationGestures={true}
          userAgent="Phantom/React-Native DApp Browser"
          {...webViewProps}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0000ff" />
            </View>
          )}
        />
        {loading && (
          <View style={styles.progressBar}>
            <ActivityIndicator size="small" color="#0000ff" />
          </View>
        )}
      </SafeAreaView>
    </DAppBrowserErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  webview: {
    flex: 1
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)'
  },
  progressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    alignItems: 'center'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default Web3View;
