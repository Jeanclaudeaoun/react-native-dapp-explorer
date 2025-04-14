import { Web3Error, EthereumProvider, JsonRpcRequest } from './types';

export class ProviderRpcError extends Error implements Web3Error {
  code: number;
  data?: unknown;

  constructor(error: { code: number; message: string; data?: unknown }) {
    super(error.message);
    this.code = error.code;
    this.data = error.data;
    this.name = 'ProviderRpcError';
  }
}

export enum ProviderErrorCode {
  // Standard JSON-RPC 2.0 errors
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,
  
  // Provider specific errors
  UNAUTHORIZED = 4100,
  UNSUPPORTED_METHOD = 4200,
  DISCONNECTED = 4900,
  CHAIN_DISCONNECTED = 4901,
  
  // User action errors
  USER_REJECTED = 4001,
  UNAUTHORIZED_CHAIN = 4902,
  
  // Custom errors
  INVALID_INPUT = -32000,
  RESOURCE_NOT_FOUND = -32001,
  RESOURCE_UNAVAILABLE = -32002,
  TRANSACTION_REJECTED = -32003,
  METHOD_NOT_SUPPORTED = -32004,
  LIMIT_EXCEEDED = -32005,
  PARSE_ERROR = -32700
}

export function validateProvider(provider: EthereumProvider): void {
  const requiredMethods: (keyof EthereumProvider)[] = [
    'getAddress',
    'getChainId',
    'signMessage',
    'sendTransaction'
  ];

  const missingMethods = requiredMethods.filter(
    (method) => typeof provider[method] !== 'function'
  );

  if (missingMethods.length > 0) {
    throw new ProviderRpcError({
      code: ProviderErrorCode.METHOD_NOT_SUPPORTED,
      message: `Invalid provider. Missing required methods: ${missingMethods.join(', ')}`
    });
  }
}

export function normalizeChainId(chainId: string | number | bigint): string {
  if (typeof chainId === 'string') {
    return chainId.toLowerCase().startsWith('0x') ? chainId : `0x${Number(chainId).toString(16)}`;
  }
  return `0x${Number(chainId).toString(16)}`;
}

export function standardizeError(error: any): ProviderRpcError {
  if (error instanceof ProviderRpcError) {
    return error;
  }

  // Map common error messages to standard codes
  const errorMapping: Record<string, { code: number; message: string }> = {
    'User rejected': { code: ProviderErrorCode.USER_REJECTED, message: 'User rejected the request' },
    'Unauthorized': { code: ProviderErrorCode.UNAUTHORIZED, message: 'Unauthorized' },
    'Chain disconnected': { code: ProviderErrorCode.CHAIN_DISCONNECTED, message: 'Chain disconnected' },
    'Method not found': { code: ProviderErrorCode.METHOD_NOT_FOUND, message: 'Method not found' },
    'Invalid parameters': { code: ProviderErrorCode.INVALID_PARAMS, message: 'Invalid parameters' }
  };

  for (const [key, value] of Object.entries(errorMapping)) {
    if (error.message?.toLowerCase().includes(key.toLowerCase())) {
      return new ProviderRpcError({
        code: value.code,
        message: value.message,
        data: error.data
      });
    }
  }

  // Default to internal error
  return new ProviderRpcError({
    code: ProviderErrorCode.INTERNAL_ERROR,
    message: error.message || 'Internal JSON-RPC error',
    data: error.data
  });
}

export function validateJsonRpcRequest(request: Partial<JsonRpcRequest>): void {
  if (!request.method) {
    throw new ProviderRpcError({
      code: ProviderErrorCode.INVALID_REQUEST,
      message: 'Invalid request: method is required'
    });
  }

  if (!request.id) {
    throw new ProviderRpcError({
      code: ProviderErrorCode.INVALID_REQUEST,
      message: 'Invalid request: id is required'
    });
  }
}
