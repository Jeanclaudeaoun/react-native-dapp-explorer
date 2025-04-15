import { PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { ProviderRpcError, ProviderErrorCode } from './provider-utils';

interface SolanaSecurityConfig {
  maxTransactionSize?: number;
  maxSignatures?: number;
  allowedProgramIds?: string[];
  blockedProgramIds?: string[];
  maxInstructions?: number;
  requireRecentBlockhash?: boolean;
}

export class SolanaSecurityManager {
  private config: Required<SolanaSecurityConfig>;
  
  // Well-known program IDs that require special attention
  private static SENSITIVE_PROGRAMS = {
    SYSTEM: '11111111111111111111111111111111',
    TOKEN: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    ASSOCIATED_TOKEN: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
    STAKE: 'Stake11111111111111111111111111111111111111',
  };

  constructor(config: SolanaSecurityConfig = {}) {
    this.config = {
      maxTransactionSize: config.maxTransactionSize || 1024 * 100, // 100KB
      maxSignatures: config.maxSignatures || 10,
      allowedProgramIds: config.allowedProgramIds || [],
      blockedProgramIds: config.blockedProgramIds || [],
      maxInstructions: config.maxInstructions || 20,
      requireRecentBlockhash: config.requireRecentBlockhash ?? true,
    };
  }

  validateTransaction(serializedTx: string): void {
    try {
      // Check transaction size
      const txBytes = Buffer.from(serializedTx, 'base64');
      if (txBytes.length > this.config.maxTransactionSize) {
        throw new ProviderRpcError({
          code: ProviderErrorCode.INVALID_PARAMS,
          message: `Transaction size exceeds maximum allowed (${txBytes.length} > ${this.config.maxTransactionSize} bytes)`
        });
      }

      // Deserialize and validate transaction
      const transaction = Transaction.from(txBytes);
      this.validateDeserializedTransaction(transaction);
    } catch (error) {
      if (error instanceof ProviderRpcError) {
        throw error;
      }
      throw new ProviderRpcError({
        code: ProviderErrorCode.INVALID_PARAMS,
        message: `Invalid transaction format: ${error.message}`
      });
    }
  }

  private validateDeserializedTransaction(transaction: Transaction): void {
    // Check signatures count
    if (transaction.signatures.length > this.config.maxSignatures) {
      throw new ProviderRpcError({
        code: ProviderErrorCode.INVALID_PARAMS,
        message: `Too many signatures (${transaction.signatures.length} > ${this.config.maxSignatures})`
      });
    }

    // Check recent blockhash if required
    if (this.config.requireRecentBlockhash && !transaction.recentBlockhash) {
      throw new ProviderRpcError({
        code: ProviderErrorCode.INVALID_PARAMS,
        message: 'Transaction must include a recent blockhash'
      });
    }

    // Validate instructions
    if (transaction.instructions.length === 0) {
      throw new ProviderRpcError({
        code: ProviderErrorCode.INVALID_PARAMS,
        message: 'Transaction must contain at least one instruction'
      });
    }

    if (transaction.instructions.length > this.config.maxInstructions) {
      throw new ProviderRpcError({
        code: ProviderErrorCode.INVALID_PARAMS,
        message: `Too many instructions (${transaction.instructions.length} > ${this.config.maxInstructions})`
      });
    }

    // Validate each instruction
    transaction.instructions.forEach(ix => this.validateInstruction(ix));
  }

  private validateInstruction(instruction: TransactionInstruction): void {
    const programId = instruction.programId.toBase58();

    // Check blocked programs
    if (this.config.blockedProgramIds.includes(programId)) {
      throw new ProviderRpcError({
        code: ProviderErrorCode.UNAUTHORIZED,
        message: `Program ${programId} is blocked`
      });
    }

    // If allowedProgramIds is not empty, only allow listed programs
    if (this.config.allowedProgramIds.length > 0 &&
        !this.config.allowedProgramIds.includes(programId)) {
      throw new ProviderRpcError({
        code: ProviderErrorCode.UNAUTHORIZED,
        message: `Program ${programId} is not in the allowed list`
      });
    }

    // Special validation for sensitive programs
    if (programId === SolanaSecurityManager.SENSITIVE_PROGRAMS.SYSTEM) {
      this.validateSystemProgramInstruction(instruction);
    } else if (programId === SolanaSecurityManager.SENSITIVE_PROGRAMS.TOKEN) {
      this.validateTokenProgramInstruction(instruction);
    }
  }

  private validateSystemProgramInstruction(instruction: TransactionInstruction): void {
    // Implement specific validation for system program instructions
    // For example, checking for dangerous operations like account creation
    const data = instruction.data;
    
    // Example: Check for CreateAccount instruction (first byte is instruction index)
    if (data[0] === 0) {
      // Validate lamports amount, space, owner, etc.
      const lamports = data.readBigUInt64LE(4);
      if (lamports > BigInt(1000000000)) { // > 1 SOL
        throw new ProviderRpcError({
          code: ProviderErrorCode.UNAUTHORIZED,
          message: 'CreateAccount instruction requests too many lamports'
        });
      }
    }
  }

  private validateTokenProgramInstruction(instruction: TransactionInstruction): void {
    // Implement specific validation for token program instructions
    // For example, checking for dangerous token operations
    const data = instruction.data;
    
    // Example: Check for SetAuthority instruction
    if (data[0] === 6) {
      throw new ProviderRpcError({
        code: ProviderErrorCode.UNAUTHORIZED,
        message: 'SetAuthority instruction is not allowed'
      });
    }
  }

  validateMessage(message: Uint8Array | string): void {
    let messageBytes: Uint8Array;
    
    if (typeof message === 'string') {
      messageBytes = new TextEncoder().encode(message);
    } else {
      messageBytes = message;
    }

    // Check message size
    if (messageBytes.length > this.config.maxTransactionSize) {
      throw new ProviderRpcError({
        code: ProviderErrorCode.INVALID_PARAMS,
        message: `Message size exceeds maximum allowed (${messageBytes.length} > ${this.config.maxTransactionSize} bytes)`
      });
    }

    // If it's a string message, check for suspicious patterns
    if (typeof message === 'string') {
      const suspiciousPatterns = [
        /delegate.*all/i,
        /approve.*unlimited/i,
        /transfer.*all/i,
        /auth.*change/i,
        /ownership.*transfer/i
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
