import { ContractManager } from '../contract-utils';
import { ProviderRpcError } from '../provider-utils';

describe('ContractManager', () => {
  describe('validateContractAddress', () => {
    it('should validate correct addresses', () => {
      expect(() => {
        ContractManager.validateContractAddress('0x1234567890123456789012345678901234567890');
      }).not.toThrow();
    });

    it('should throw on invalid addresses', () => {
      expect(() => {
        ContractManager.validateContractAddress('0xinvalid');
      }).toThrow(ProviderRpcError);
    });
  });

  describe('validateContractMethod', () => {
    const mockAbi = [
      {
        name: 'transfer',
        type: 'function',
        inputs: [
          { name: 'recipient', type: 'address' },
          { name: 'amount', type: 'uint256' }
        ],
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'nonpayable'
      }
    ];

    it('should validate existing methods', () => {
      expect(() => {
        ContractManager.validateContractMethod(mockAbi, 'transfer');
      }).not.toThrow();
    });

    it('should throw on non-existent methods', () => {
      expect(() => {
        ContractManager.validateContractMethod(mockAbi, 'nonexistent');
      }).toThrow(ProviderRpcError);
    });
  });
});
