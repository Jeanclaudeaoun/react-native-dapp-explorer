import React, { useRef, useEffect, useCallback } from 'react';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { SolanaProvider, EthereumProvider } from '../types';

interface WebViewBridgeProps {
  ethProvider?: EthereumProvider;
  solanaProvider?: SolanaProvider;
  url: string;
  onMessage?: (event: WebViewMessageEvent) => void;
}

export const WebViewBridge: React.FC<WebViewBridgeProps> = ({
  ethProvider,
  solanaProvider,
  url,
  onMessage,
  ...props
}) => {
  const webViewRef = useRef<WebView>(null);

  const injectProviders = useCallback(() => {
    const script = `
      (function() {
        ${ethProvider ? 'window.ethereum = {...};' : ''}
        ${solanaProvider ? 'window.solana = {...};' : ''}
        true;
      })();
    `;
    webViewRef.current?.injectJavaScript(script);
  }, [ethProvider, solanaProvider]);

  useEffect(() => {
    injectProviders();
  }, [injectProviders]);

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    onMessage?.(event);
  }, [onMessage]);

  return (
    <WebView
      ref={webViewRef}
      source={{ uri: url }}
      onMessage={handleMessage}
      {...props}
    />
  );
};