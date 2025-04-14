import React, { useRef, useEffect, useState, useCallback } from 'react';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { View, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { Web3ViewProps, TransactionRequest } from './types';
import { chains } from './chains';
import { formatTransactionError, validateTransaction, getExplorerUrl } from './tx-utils';
import { SecurityManager } from './security';
import { styles } from './styles';

const Web3View: React.FC<Web3ViewProps> = ({
  provider,
  url,
  chainId,
  onChainChanged,
  onTransactionStart,
  onTransactionHash,
  onTransactionComplete,
  onSignMessage,
  onSignComplete,
  onError,
  trustedDomains,
  allowedMethods,
  style,
  ...webViewProps
}) => {
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [injectedJavaScript, setInjectedJavaScript] = useState<string | null>(null);
  
  const securityManager = useRef(new SecurityManager({ trustedDomains, allowedMethods }));
  
  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
    setError(null);
  }, []);

  const handleLoadEnd = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleError = useCallback((syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    setError(nativeEvent.description || 'Failed to load DApp');
    setIsLoading(false);
    onError?.(nativeEvent);
  }, [onError]);

  const handleRetry = useCallback(() => {
    setError(null);
    webViewRef.current?.reload();
  }, []);

  const handleMessage = useCallback(async (event: WebViewMessageEvent) => {
    try {
      const { id, method, params } = JSON.parse(event.nativeEvent.data);
      
      // Validate request security
      securityManager.current.validateRequest(url, method);
      
      let result;
      switch (method) {
        case 'eth_requestAccounts':
        case 'eth_accounts': {
          const address = await provider.getAddress();
          result = address ? [address] : [];
          if (method === 'eth_requestAccounts' && result.length > 0) {
            webViewRef.current?.injectJavaScript(`
              window.ethereum.emit('connect', { chainId: '0x${chainId.toString(16)}' });
              window.ethereum.emit('accountsChanged', ${JSON.stringify(result)});
              true;
            `);
          }
          break;
        }

        case 'eth_chainId':
          result = '0x' + chainId.toString(16);
          break;

        case 'eth_sendTransaction': {
          const tx = params[0] as TransactionRequest;
          try {
            validateTransaction(tx);
            onTransactionStart?.(tx);
            
            const hash = await provider.sendTransaction(tx);
            onTransactionHash?.(hash);
            
            const explorerUrl = getExplorerUrl(chainId, hash);
            onTransactionComplete?.(hash, true, explorerUrl);
            
            result = hash;
          } catch (error: any) {
            const formattedError = formatTransactionError(error);
            onError?.(formattedError);
            throw error;
          }
          break;
        }

        case 'personal_sign':
        case 'eth_sign': {
          const message = method === 'personal_sign' ? params[0] : params[1];
          onSignMessage?.(message);
          
          const signature = await provider.signMessage(message);
          onSignComplete?.(signature);
          result = signature;
          break;
        }

        case 'eth_signTypedData':
        case 'eth_signTypedData_v4': {
          if (!provider.signTypedData) {
            throw new Error('Typed data signing not supported');
          }
          const data = JSON.parse(params[1]);
          result = await provider.signTypedData(data);
          break;
        }

        case 'wallet_switchEthereumChain': {
          const newChainId = parseInt(params[0].chainId);
          if (!chains[newChainId]) {
            throw new Error(`Chain ${newChainId} not supported`);
          }
          
          await onChainChanged?.(newChainId);
          result = null;
          
          webViewRef.current?.injectJavaScript(`
            window.ethereum.chainId = '${params[0].chainId}';
            window.ethereum.networkVersion = '${newChainId}';
            window.ethereum.emit('chainChanged', '${params[0].chainId}');
            true;
          `);
          break;
        }

        default:
          if (provider.request) {
            result = await provider.request({ method, params });
          } else {
            throw new Error(`Method ${method} not supported`);
          }
      }

      webViewRef.current?.postMessage(JSON.stringify({
        id,
        result,
        jsonrpc: '2.0'
      }));
    } catch (error: any) {
      console.warn('Web3View error:', error);
      onError?.(error);
      
      webViewRef.current?.postMessage(JSON.stringify({
        id,
        error: {
          code: error.code || -32603,
          message: error.message || 'Internal error',
          data: error.data
        },
        jsonrpc: '2.0'
      }));
    }
  }, [provider, chainId, url, onTransactionStart, onTransactionHash, onTransactionComplete, onSignMessage, onSignComplete, onError, onChainChanged]);

  useEffect(() => {
    const injectedScript = `
      (function() {
        window.ethereum = {
          isMetaMask: true,
          networkVersion: '${chainId}',
          chainId: '0x${chainId.toString(16)}',
          _events: {},
          
          request: async function({ method, params }) {
            return new Promise((resolve, reject) => {
              const id = Date.now() * 1000 + Math.floor(Math.random() * 1000);
              
              const handler = (event) => {
                const response = JSON.parse(event.data);
                if (response.id === id) {
                  window.removeEventListener('message', handler);
                  if (response.error) {
                    const error = new Error(response.error.message);
                    error.code = response.error.code;
                    error.data = response.error.data;
                    reject(error);
                  } else {
                    resolve(response.result);
                  }
                }
              };
              
              window.addEventListener('message', handler);
              window.ReactNativeWebView.postMessage(JSON.stringify({
                jsonrpc: '2.0',
                id,
                method,
                params
              }));
            });
          },
          
          on: function(eventName, listener) {
            if (!this._events[eventName]) {
              this._events[eventName] = new Set();
            }
            this._events[eventName].add(listener);
            return this;
          },
          
          removeListener: function(eventName, listener) {
            if (this._events[eventName]) {
              this._events[eventName].delete(listener);
            }
            return this;
          },
          
          emit: function(eventName, data) {
            if (this._events[eventName]) {
              this._events[eventName].forEach(listener => listener(data));
            }
            return this;
          }
        };

        window.web3 = {
          currentProvider: window.ethereum
        };

        true;
      })();
    `;

    setInjectedJavaScript(injectedScript);
  }, [chainId]);

  if (error) {
    return (
      <View style={[styles.errorContainer, style]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        source={{ uri: url }}
        style={styles.webview}
        injectedJavaScript={injectedJavaScript}
        onMessage={handleMessage}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        {...webViewProps}
      />
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      )}
    </View>
  );
};

export default Web3View;
