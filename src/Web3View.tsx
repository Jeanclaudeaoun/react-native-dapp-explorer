import React, { useRef, useEffect, useCallback } from 'react';
import { WebView, WebViewProps } from 'react-native-webview';
import { ProviderInjector } from './core/ProviderInjector';
import type { SolanaProvider, EthereumProvider } from './types';

export interface Web3ViewProps extends Omit<WebViewProps, 'source' | 'injectedJavaScript'> {
  url: string;
  ethProvider?: EthereumProvider;
  solanaProvider?: SolanaProvider;
  trustedDomains?: string[];
  onError?: (error: Error) => void;
}

export const Web3View: React.FC<Web3ViewProps> = ({
  url,
  ethProvider,
  solanaProvider,
  trustedDomains = [],
  onError,
  ...webViewProps
}) => {
  const webViewRef = useRef<WebView>(null);

  const validateDomain = useCallback((pageUrl: string) => {
    if (trustedDomains.length === 0) return true;
    try {
      const domain = new URL(pageUrl).hostname;
      return trustedDomains.some(trusted => domain.endsWith(trusted));
    } catch {
      return false;
    }
  }, [trustedDomains]);

  const injectProviders = useCallback(() => {
    if (!validateDomain(url)) {
      onError?.(new Error('Domain not trusted'));
      return;
    }

    const injectedScript = `
      ${ethProvider ? ProviderInjector.injectEthereumProvider() : ''}
      ${solanaProvider ? ProviderInjector.injectSolanaProvider() : ''}
      true;
    `;

    webViewRef.current?.injectJavaScript(injectedScript);
  }, [url, ethProvider, solanaProvider, validateDomain, onError]);

  useEffect(() => {
    injectProviders();
  }, [injectProviders]);

  return (
    <WebView
      ref={webViewRef}
      source={{ uri: url }}
      {...webViewProps}
    />
  );
};