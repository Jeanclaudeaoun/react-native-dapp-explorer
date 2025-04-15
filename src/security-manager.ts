import { ProviderRpcError, ProviderErrorCode } from './provider-utils';

interface SecurityConfig {
  trustedDomains?: string[];
  allowedMethods?: string[];
  maxTransactionSize?: number;
  requireUserApproval?: boolean;
}

export class SecurityManager {
  private trustedDomains: Set<string>;
  private allowedMethods: Set<string>;
  private maxTransactionSize: number;
  private requireUserApproval: boolean;

  constructor(config: SecurityConfig = {}) {
    this.trustedDomains = new Set(config.trustedDomains || []);
    this.allowedMethods = new Set(config.allowedMethods || [
      // Solana methods
      'solanaSignTransaction',
      'solanaSignAllTransactions',
      'solanaSignMessage',
      'solanaRequest',
      // EVM methods
      'eth_requestAccounts',
      'eth_accounts',
      'eth_chainId',
      'eth_sendTransaction',
      'eth_sign',
      'personal_sign',
      'eth_signTypedData_v4'
    ]);
    this.maxTransactionSize = config.maxTransactionSize || 1024 * 100; // 100KB
    this.requireUserApproval = config.requireUserApproval ?? true;
  }

  validateRequest(origin: string, method?: string): void {
    // Validate domain
    if (this.trustedDomains.size > 0) {
      const domain = new URL(origin).hostname;
      if (!this.trustedDomains.has(domain)) {
        throw new ProviderRpcError({
          code: ProviderErrorCode.UNAUTHORIZED,
          message: `Untrusted domain: ${domain}`
        });
      }
    }

    // Validate method
    if (method && !this.allowedMethods.has(method)) {
      throw new ProviderRpcError({
        code: ProviderErrorCode.UNAUTHORIZED,
        message: `Method not allowed: ${method}`
      });
    }
  }

  validateSolanaTransaction(transaction: any): void {
    // Validate transaction size
    const txSize = new TextEncoder().encode(JSON.stringify(transaction)).length;
    if (txSize > this.maxTransactionSize) {
      throw new ProviderRpcError({
        code: ProviderErrorCode.INVALID_PARAMS,
        message: `Transaction size (${txSize} bytes) exceeds maximum allowed (${this.maxTransactionSize} bytes)`
      });
    }

    // Validate transaction structure
    if (!transaction || typeof transaction !== 'object') {
      throw new ProviderRpcError({
        code: ProviderErrorCode.INVALID_PARAMS,
        message: 'Invalid transaction format'
      });
    }

    // Validate instructions
    if (!Array.isArray(transaction.instructions)) {
      throw new ProviderRpcError({
        code: ProviderErrorCode.INVALID_PARAMS,
        message: 'Transaction must contain instructions array'
      });
    }

    // Check for suspicious instructions or known malicious patterns
    this.validateSolanaInstructions(transaction.instructions);
  }

  private validateSolanaInstructions(instructions: any[]): void {
    for (const ix of instructions) {
      // Validate instruction format
      if (!ix || typeof ix !== 'object') {
        throw new ProviderRpcError({
          code: ProviderErrorCode.INVALID_PARAMS,
          message: 'Invalid instruction format'
        });
      }

      // Check for suspicious program IDs (example list)
      const suspiciousProgramIds = new Set([
        '11111111111111111111111111111111', // System Program (require extra validation)
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' // SPL Token (require extra validation)
      ]);

      if (ix.programId && suspiciousProgramIds.has(ix.programId)) {
        // Implement specific validation rules for known program IDs
        this.validateSolanaProgramInteraction(ix);
      }
    }
  }

  private validateSolanaProgramInteraction(instruction: any): void {
    // Example: Validate token program interactions
    if (instruction.programId === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') {
      // Check for suspicious token operations
      const knownMaliciousTokens = new Set([
        // Add known malicious token addresses
      ]);

      if (instruction.keys && instruction.keys.some((key: any) => 
        knownMaliciousTokens.has(key.pubkey)
      )) {
        throw new ProviderRpcError({
          code: ProviderErrorCode.UNAUTHORIZED,
          message: 'Interaction with suspicious token detected'
        });
      }
    }
  }

  validateSolanaMessage(message: Uint8Array | string): void {
    let messageSize: number;
    
    if (message instanceof Uint8Array) {
      messageSize = message.length;
    } else {
      messageSize = new TextEncoder().encode(message).length;
    }

    if (messageSize > this.maxTransactionSize) {
      throw new ProviderRpcError({
        code: ProviderErrorCode.INVALID_PARAMS,
        message: `Message size (${messageSize} bytes) exceeds maximum allowed (${this.maxTransactionSize} bytes)`
      });
    }

    // Check for known malicious message patterns
    if (typeof message === 'string') {
      const suspiciousPatterns = [
        /delegate.*all/i,
        /approve.*unlimited/i,
        /transfer.*all/i
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(message)) {
          throw new ProviderRpcError({
            code: ProviderErrorCode.UNAUTHORIZED,
            message: 'Suspicious message content detected'
          });
        }
      }
    }
  }
}
