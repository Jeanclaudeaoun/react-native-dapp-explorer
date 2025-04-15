import type { SolanaProvider } from '../types';
import { SolanaUtils, SOLANA_CLUSTERS } from '../solana-utils';
import { ProviderRpcError } from '../provider-utils';

jest.mock('../provider-utils');

describe('SolanaUtils', () => {
  describe('validateCluster', () => {
    it('should not throw for valid clusters', () => {
      expect(() => SolanaUtils.validateCluster('mainnet-beta')).not.toThrow();
      expect(() => SolanaUtils.validateCluster('testnet')).not.toThrow();
      expect(() => SolanaUtils.validateCluster('devnet')).not.toThrow();
    });

    it('should throw for invalid clusters', () => {
      expect(() => SolanaUtils.validateCluster('invalid-cluster')).toThrow();
      expect(() => SolanaUtils.validateCluster('')).toThrow();
    });
  });

  describe('validatePublicKey', () => {
    it('should not throw for valid Solana public keys', () => {
      expect(() => 
        SolanaUtils.validatePublicKey('7v91N7iZ9mNicL8WfG6cgSCKyRXydQjLh6UYBWwm6y1Q')
      ).not.toThrow();
    });

    it('should throw for invalid public keys', () => {
      expect(() => SolanaUtils.validatePublicKey('invalid-key')).toThrow();
      expect(() => SolanaUtils.validatePublicKey('')).toThrow();
    });
  });

  describe('formatSignatureWarning', () => {
    it('should return correct warning for transactions', () => {
      expect(SolanaUtils.formatSignatureWarning('transaction'))
        .toContain('sign a Solana transaction');
    });

    it('should return correct warning for messages', () => {
      expect(SolanaUtils.formatSignatureWarning('message'))
        .toContain('sign a message');
    });
  });

  describe('getClusterExplorerUrl', () => {
    it('should return correct mainnet explorer URL', () => {
      const signature = '5wXyN3TN';
      expect(SolanaUtils.getClusterExplorerUrl('mainnet-beta', signature))
        .toBe(`https://explorer.solana.com/tx/${signature}`);
    });

    it('should return correct testnet explorer URL', () => {
      const signature = '5wXyN3TN';
      expect(SolanaUtils.getClusterExplorerUrl('testnet', signature))
        .toBe(`https://explorer.solana.com/?cluster=testnet/tx/${signature}`);
    });

    it('should support address type', () => {
      const address = '7v91N7iZ9mNicL8WfG6cgSCKyRXydQjLh6UYBWwm6y1Q';
      expect(SolanaUtils.getClusterExplorerUrl('mainnet-beta', address, 'address'))
        .toBe(`https://explorer.solana.com/address/${address}`);
    });
  });

  describe('SOLANA_CLUSTERS', () => {
    it('should have correct cluster configurations', () => {
      expect(SOLANA_CLUSTERS['mainnet-beta']).toEqual({
        name: 'Mainnet Beta',
        endpoint: 'https://api.mainnet-beta.solana.com',
        chainId: '101'
      });

      expect(SOLANA_CLUSTERS['testnet']).toEqual({
        name: 'Testnet',
        endpoint: 'https://api.testnet.solana.com',
        chainId: '102'
      });

      expect(SOLANA_CLUSTERS['devnet']).toEqual({
        name: 'Devnet',
        endpoint: 'https://api.devnet.solana.com',
        chainId: '103'
      });
    });
  });
});
