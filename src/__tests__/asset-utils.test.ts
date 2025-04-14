import { AssetManager } from '../asset-utils';
import { ProviderRpcError } from '../provider-utils';

describe('AssetManager', () => {
  describe('validateTokenAddress', () => {
    it('should validate correct token addresses', () => {
      expect(() => {
        AssetManager.validateTokenAddress('0x1234567890123456789012345678901234567890');
      }).not.toThrow();
    });

    it('should throw on invalid token addresses', () => {
      expect(() => {
        AssetManager.validateTokenAddress('invalid');
      }).toThrow(ProviderRpcError);
    });
  });

  describe('detectTokenType', () => {
    const mockProvider = {
      call: jest.fn()
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should detect ERC20 tokens', async () => {
      mockProvider.call.mockResolvedValueOnce('0x0000000000000000000000000000000000000000000000000000000000000000')  // Not ERC165
        .mockResolvedValueOnce('0x0000000000000000000000000000000000000000000000000000000000000012');  // Has decimals()

      const result = await AssetManager.detectTokenType(
        mockProvider,
        '0x1234567890123456789012345678901234567890'
      );

      expect(result).toBe('ERC20');
    });

    it('should detect ERC721 tokens', async () => {
      mockProvider.call.mockResolvedValueOnce('0x0000000000000000000000000000000000000000000000000000000000000001')  // Is ERC165
        .mockResolvedValueOnce('0x0000000000000000000000000000000000000000000000000000000000000001');  // Is ERC721

      const result = await AssetManager.detectTokenType(
        mockProvider,
        '0x1234567890123456789012345678901234567890'
      );

      expect(result).toBe('ERC721');
    });
  });

  describe('createTokenApprovalWarning', () => {
    it('should create warning for unlimited approval', () => {
      const token = {
        address: '0x1234567890123456789012345678901234567890',
        symbol: 'TEST',
        decimals: 18,
        name: 'Test Token',
        type: 'ERC20' as const
      };

      const warning = AssetManager.createTokenApprovalWarning(
        token,
        '0x1234567890123456789012345678901234567890',
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
      );

      expect(warning).toContain('unlimited approval');
    });
  });
});
