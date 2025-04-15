import { render, act, fireEvent } from '@testing-library/react-native';
import React from 'react';
import { EnhancedSolanaDAppBrowser } from '../../example/EnhancedSolanaDAppBrowser';
import { Transaction, PublicKey, Connection } from '@solana/web3.js';
import { WebView } from 'react-native-webview';
import { DAppManager } from '../dapp-manager';

// Mock dependencies
jest.mock('react-native-webview', () => ({
  WebView: jest.fn()
}));

jest.mock('@solana/web3.js', () => ({
  Connection: jest.fn(),
  Transaction: {
    from: jest.fn()
  },
  PublicKey: jest.fn()
}));

describe('Solana DApp Browser Integration', () => {
  const mockWallet = {
    publicKey: 'mockPublicKey',
    cluster: 'devnet',
    signTransaction: jest.fn(),
    signAllTransactions: jest.fn(),
    signMessage: jest.fn()
  };

  const mockTransaction = {
    serialize: jest.fn().mockReturnValue(Buffer.from('mockSerializedTx')),
    signatures: [],
    recentBlockhash: 'mock-blockhash'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (Transaction.from as jest.Mock).mockReturnValue(mockTransaction);
    (WebView as jest.Mock).mockImplementation(({ onMessage }) => ({
      injectJavaScript: jest.fn(),
      onMessage
    }));
  });

  it('should properly handle Solana transaction signing', async () => {
    const onSolanaTransactionStart = jest.fn();
    const onSolanaTransactionComplete = jest.fn();
    const onError = jest.fn();

    const { getByTestId } = render(
      <EnhancedSolanaDAppBrowser
        wallet={mockWallet}
        onSolanaTransactionStart={onSolanaTransactionStart}
        onSolanaTransactionComplete={onSolanaTransactionComplete}
        onError={onError}
      />
    );

    // Simulate receiving a transaction signing request
    const mockWebViewMessage = {
      nativeEvent: {
        data: JSON.stringify({
          type: 'solanaSignTransaction',
          id: 'test-id',
          params: {
            transaction: Buffer.from('mockTx').toString('base64')
          }
        })
      }
    };

    // Mock successful transaction signing
    mockWallet.signTransaction.mockResolvedValueOnce(mockTransaction);

    // Trigger the message handler
    await act(async () => {
      const webview = getByTestId('web3-view');
      fireEvent(webview, 'message', mockWebViewMessage);
    });

    expect(onSolanaTransactionStart).toHaveBeenCalled();
    expect(mockWallet.signTransaction).toHaveBeenCalled();
    expect(onSolanaTransactionComplete).toHaveBeenCalledWith(
      expect.any(String),
      true
    );
    expect(onError).not.toHaveBeenCalled();
  });

  it('should handle message signing requests', async () => {
    const onSolanaSignMessage = jest.fn();
    const onError = jest.fn();

    const { getByTestId } = render(
      <EnhancedSolanaDAppBrowser
        wallet={mockWallet}
        onSolanaSignMessage={onSolanaSignMessage}
        onError={onError}
      />
    );

    // Simulate receiving a message signing request
    const mockMessage = 'Hello, Solana!';
    const mockWebViewMessage = {
      nativeEvent: {
        data: JSON.stringify({
          type: 'solanaSignMessage',
          id: 'test-id',
          params: {
            message: Buffer.from(mockMessage).toString('base64')
          }
        })
      }
    };

    // Mock successful message signing
    mockWallet.signMessage.mockResolvedValueOnce(
      Buffer.from('mockedSignature')
    );

    // Trigger the message handler
    await act(async () => {
      const webview = getByTestId('web3-view');
      fireEvent(webview, 'message', mockWebViewMessage);
    });

    expect(mockWallet.signMessage).toHaveBeenCalled();
    expect(onSolanaSignMessage).toHaveBeenCalledWith(expect.any(Uint8Array));
    expect(onError).not.toHaveBeenCalled();
  });

  it('should handle connection changes and network errors', async () => {
    const mockDAppManager = new DAppManager({
      endpoints: {
        'devnet': ['https://api.devnet.solana.com']
      }
    });

    const { getByTestId } = render(
      <EnhancedSolanaDAppBrowser
        wallet={mockWallet}
        customRpcEndpoints={{
          'devnet': ['https://custom.devnet.solana.com']
        }}
      />
    );

    // Simulate RPC endpoint failure
    const mockFailedConnection = new Error('Connection failed');
    (Connection as jest.Mock).mockImplementationOnce(() => {
      throw mockFailedConnection;
    });

    // Trigger a connection change
    await act(async () => {
      mockDAppManager.emit('connectionStateChanged', { isOnline: false });
    });

    // Verify that the connection manager attempted failover
    expect(Connection).toHaveBeenCalledWith(
      'https://custom.devnet.solana.com',
      expect.any(String)
    );
  });

  it('should respect transaction security limits', async () => {
    const onError = jest.fn();

    const { getByTestId } = render(
      <EnhancedSolanaDAppBrowser
        wallet={mockWallet}
        onError={onError}
      />
    );

    // Create a large transaction that exceeds security limits
    const largeTx = Buffer.alloc(200 * 1024); // 200KB transaction
    const mockWebViewMessage = {
      nativeEvent: {
        data: JSON.stringify({
          type: 'solanaSignTransaction',
          id: 'test-id',
          params: {
            transaction: largeTx.toString('base64')
          }
        })
      }
    };

    // Trigger the message handler
    await act(async () => {
      const webview = getByTestId('web3-view');
      fireEvent(webview, 'message', mockWebViewMessage);
    });

    // Verify that the security check failed
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('exceeds maximum allowed')
      })
    );
  });

  it('should batch multiple rapid transactions', async () => {
    const { getByTestId } = render(
      <EnhancedSolanaDAppBrowser wallet={mockWallet} />
    );

    // Simulate multiple rapid transaction requests
    const createTxMessage = (id: string) => ({
      nativeEvent: {
        data: JSON.stringify({
          type: 'solanaSignTransaction',
          id,
          params: {
            transaction: Buffer.from('mockTx').toString('base64')
          }
        })
      }
    });

    // Send multiple transactions quickly
    await act(async () => {
      const webview = getByTestId('web3-view');
      fireEvent(webview, 'message', createTxMessage('tx1'));
      fireEvent(webview, 'message', createTxMessage('tx2'));
      fireEvent(webview, 'message', createTxMessage('tx3'));
    });

    // Verify that transactions were batched
    expect(mockWallet.signAllTransactions).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.any(Transaction),
        expect.any(Transaction),
        expect.any(Transaction)
      ])
    );
  });
});
