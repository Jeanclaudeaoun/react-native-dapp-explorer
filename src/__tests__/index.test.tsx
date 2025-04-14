import React from 'react';
import { render, act } from '@testing-library/react-native';
import Web3View from '../index';
import { WebView } from 'react-native-webview';
import { validateProvider } from '../provider-utils';

// Mock WebView component
jest.mock('react-native-webview', () => ({
  WebView: jest.fn().mockImplementation(({ onMessage, injectedJavaScript }) => null),
}));

describe('Web3View', () => {
  const mockProvider = {
    getAddress: jest.fn().mockResolvedValue('0x123'),
    getChainId: jest.fn().mockResolvedValue(1),
    getBlockNumber: jest.fn().mockResolvedValue('0x1'),
    signMessage: jest.fn().mockResolvedValue('0xsignature'),
    signTypedData: jest.fn().mockResolvedValue('0xsignature'),
    sendTransaction: jest.fn().mockResolvedValue('0xtxhash'),
    setChainId: jest.fn().mockResolvedValue(undefined),
    call: jest.fn().mockResolvedValue('0x'),
    send: jest.fn().mockResolvedValue('0x'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('validates the provider', () => {
    expect(() => validateProvider(mockProvider)).not.toThrow();
  });

  it('renders WebView with correct props', () => {
    render(
      <Web3View
        provider={mockProvider}
        url="https://example.com"
        chainId={1}
      />
    );

    expect(WebView).toHaveBeenCalledWith(
      expect.objectContaining({
        source: { uri: 'https://example.com' },
        javaScriptEnabled: true,
        domStorageEnabled: true,
        incognito: true,
      }),
      expect.any(Object)
    );
  });

  it('handles eth_requestAccounts correctly', async () => {
    const { UNSAFE_getByType } = render(
      <Web3View
        provider={mockProvider}
        url="https://example.com"
        chainId={1}
      />
    );

    const webView = UNSAFE_getByType(WebView);
    await act(async () => {
      await webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({
            id: 1,
            jsonrpc: '2.0',
            method: 'eth_requestAccounts',
          }),
        },
      });
    });

    expect(mockProvider.getAddress).toHaveBeenCalled();
  });

  // Add more test cases for other methods
});
