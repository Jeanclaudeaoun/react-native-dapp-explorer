import * as React from 'react';
import { render, act } from '@testing-library/react-native';
import { WebView } from 'react-native-webview';
import Web3View from '../index';

jest.mock('react-native-webview', () => ({
  WebView: jest.fn(),
}));

describe('Web3View Solana Integration', () => {
  const mockSolanaProvider = {
    getPublicKey: jest.fn(() => Promise.resolve('7v91N7iZ9mNicL8WfG6cgSCKyRXydQjLh6UYBWwm6y1Q')),
    getCluster: jest.fn(() => Promise.resolve('mainnet-beta')),
    signTransaction: jest.fn(() => Promise.resolve('base64_signed_transaction')),
    signAllTransactions: jest.fn(() => Promise.resolve(['base64_signed_tx_1', 'base64_signed_tx_2'])),
    signMessage: jest.fn(() => Promise.resolve('base64_signed_message')),
  };

  beforeEach(() => {
    (WebView as jest.Mock).mockClear();
    Object.values(mockSolanaProvider).forEach(mock => mock.mockClear());
  });

  it('should initialize with Solana provider', () => {
    render(
      <Web3View
        provider={{}} // Empty EVM provider
        solanaProvider={mockSolanaProvider}
        url="https://app.solana.com"
        chainId={1}
      />
    );

    const webViewProps = (WebView as jest.Mock).mock.calls[0][0];
    expect(webViewProps.injectedJavaScriptBeforeContentLoaded).toContain('window.solana');
    expect(webViewProps.injectedJavaScriptBeforeContentLoaded).toContain('isPhantom: true');
  });

  it('should handle Solana transaction signing', async () => {
    const onSolanaTransactionStart = jest.fn();
    const onSolanaTransactionComplete = jest.fn();

    const { UNSAFE_getByType } = render(
      <Web3View
        provider={{}}
        solanaProvider={mockSolanaProvider}
        url="https://app.solana.com"
        chainId={1}
        onSolanaTransactionStart={onSolanaTransactionStart}
        onSolanaTransactionComplete={onSolanaTransactionComplete}
      />
    );

    const webView = UNSAFE_getByType(WebView);
    const mockTransaction = { instructions: [] };

    await act(async () => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({
            id: '1',
            type: 'solana',
            method: 'signTransaction',
            params: [mockTransaction],
          }),
        },
      });
    });

    expect(onSolanaTransactionStart).toHaveBeenCalledWith(mockTransaction);
    expect(mockSolanaProvider.signTransaction).toHaveBeenCalledWith(mockTransaction);
    expect(onSolanaTransactionComplete).toHaveBeenCalledWith('base64_signed_transaction', true);
  });

  it('should handle Solana message signing', async () => {
    const onSolanaSignMessage = jest.fn();
    const onSignComplete = jest.fn();

    const { UNSAFE_getByType } = render(
      <Web3View
        provider={{}}
        solanaProvider={mockSolanaProvider}
        url="https://app.solana.com"
        chainId={1}
        onSolanaSignMessage={onSolanaSignMessage}
        onSignComplete={onSignComplete}
      />
    );

    const webView = UNSAFE_getByType(WebView);
    const mockMessage = new Uint8Array([1, 2, 3]);

    await act(async () => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({
            id: '1',
            type: 'solana',
            method: 'signMessage',
            params: [mockMessage],
          }),
        },
      });
    });

    expect(onSolanaSignMessage).toHaveBeenCalledWith(mockMessage);
    expect(mockSolanaProvider.signMessage).toHaveBeenCalledWith(mockMessage);
    expect(onSignComplete).toHaveBeenCalledWith('base64_signed_message');
  });

  it('should handle errors gracefully', async () => {
    const onError = jest.fn();
    mockSolanaProvider.signTransaction.mockRejectedValueOnce(new Error('Signing failed'));

    const { UNSAFE_getByType } = render(
      <Web3View
        provider={{}}
        solanaProvider={mockSolanaProvider}
        url="https://app.solana.com"
        chainId={1}
        onError={onError}
      />
    );

    const webView = UNSAFE_getByType(WebView);

    await act(async () => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({
            id: '1',
            type: 'solana',
            method: 'signTransaction',
            params: [{}],
          }),
        },
      });
    });

    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });
});
