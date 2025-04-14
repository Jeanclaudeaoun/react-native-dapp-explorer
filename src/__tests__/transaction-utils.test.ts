import { TransactionManager } from '../transaction-utils';

describe('TransactionManager', () => {
  const mockProvider = {
    call: jest.fn()
  };

  let transactionManager: TransactionManager;

  beforeEach(() => {
    jest.clearAllMocks();
    transactionManager = new TransactionManager({ pollingInterval: 100, requiredConfirmations: 2 });
  });

  describe('estimateGas', () => {
    it('should estimate gas for EIP-1559 transactions', async () => {
      // Mock EIP-1559 block data
      mockProvider.call
        .mockResolvedValueOnce({
          baseFeePerGas: '0x1',
          number: '0x1'
        })
        .mockResolvedValueOnce('0x1') // maxPriorityFee
        .mockResolvedValueOnce('0x5208'); // gasLimit

      const result = await transactionManager.estimateGas(
        mockProvider,
        { to: '0x1234', value: '0x1' },
        1
      );

      expect(result).toHaveProperty('maxFeePerGas');
      expect(result).toHaveProperty('maxPriorityFeePerGas');
      expect(result).toHaveProperty('gasLimit');
    });

    it('should estimate gas for legacy transactions', async () => {
      // Mock legacy block data
      mockProvider.call
        .mockResolvedValueOnce({})  // No baseFeePerGas
        .mockResolvedValueOnce('0x1') // gasPrice
        .mockResolvedValueOnce('0x5208'); // gasLimit

      const result = await transactionManager.estimateGas(
        mockProvider,
        { to: '0x1234', value: '0x1' },
        1
      );

      expect(result).toHaveProperty('gasLimit');
    });
  });

  describe('monitorTransaction', () => {
    it('should monitor transaction until required confirmations', async () => {
      const txHash = '0x123';
      const receipt = { status: '0x1', blockNumber: '0x1' };
      
      mockProvider.call
        .mockResolvedValueOnce(receipt)
        .mockResolvedValueOnce('0x2')  // current block
        .mockResolvedValueOnce(receipt)
        .mockResolvedValueOnce('0x3'); // current block

      const onUpdate = jest.fn();

      const status = await transactionManager.monitorTransaction(
        mockProvider,
        txHash,
        1,
        onUpdate
      );

      expect(status.status).toBe('confirmed');
      expect(status.confirmations).toBeGreaterThanOrEqual(2);
      expect(onUpdate).toHaveBeenCalled();
    });
  });

  describe('validateTransactionSpeed', () => {
    it('should classify transaction speeds correctly', () => {
      const slow = transactionManager.validateTransactionSpeed(
        '0x3B9ACA00',  // 1 GWEI
        '0x3B9ACA00'
      );
      expect(slow).toBe('slow');

      const fast = transactionManager.validateTransactionSpeed(
        '0x2540BE400',  // 10 GWEI
        '0x2540BE400'
      );
      expect(fast).toBe('fast');
    });
  });
});
