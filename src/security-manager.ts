import { ProviderRpcError, ProviderErrorCode } from './provider-utils';

const RESTRICTED_DOMAINS = [
  'evil-site.com',
  // Add known malicious domains
];

const BLOCKED_METHODS = [
  'wallet_addEthereumChain', // Require explicit user approval
  'wallet_watchAsset',      // Require explicit user approval
];

const HIGH_RISK_METHODS = [
  'eth_sendTransaction',
  'eth_sign',
  'personal_sign',
  'eth_signTypedData',
  'eth_signTypedData_v4',
];

export class SecurityManager {
  private readonly trustedDomains: string[];
  private readonly allowedMethods: string[];

  constructor(options: {
    trustedDomains?: string[];
    allowedMethods?: string[];
  } = {}) {
    this.trustedDomains = options.trustedDomains || [];
    this.allowedMethods = options.allowedMethods || [];
  }

  validateDomain(url: string): void {
    const domain = new URL(url).hostname;
    
    if (RESTRICTED_DOMAINS.includes(domain)) {
      throw new ProviderRpcError({
        code: ProviderErrorCode.UNAUTHORIZED,
        message: 'Domain not allowed'
      });
    }

    if (!this.trustedDomains.includes(domain)) {
      // Log untrusted domain access for monitoring
      console.warn(`Untrusted domain access: ${domain}`);
    }
  }

  validateMethod(method: string): { requiresUserApproval: boolean } {
    if (BLOCKED_METHODS.includes(method) && !this.allowedMethods.includes(method)) {
      throw new ProviderRpcError({
        code: ProviderErrorCode.UNAUTHORIZED,
        message: `Method ${method} not allowed`
      });
    }

    return {
      requiresUserApproval: HIGH_RISK_METHODS.includes(method)
    };
  }

  validateTransactionSecurity(tx: any): void {
    // Check for common attack patterns
    if (tx.data && this.containsSuspiciousPattern(tx.data)) {
      throw new ProviderRpcError({
        code: ProviderErrorCode.TRANSACTION_REJECTED,
        message: 'Potentially malicious transaction detected'
      });
    }
  }

  private containsSuspiciousPattern(data: string): boolean {
    // Check for known malicious patterns
    const suspiciousPatterns = [
      /transferFrom.*0{40}/i,      // Suspicious transferFrom to zero address
      /setApprovalForAll.*true/i,  // Unlimited approval
    ];

    return suspiciousPatterns.some(pattern => pattern.test(data));
  }

  static sanitizeRequest(request: any): any {
    // Remove any potentially dangerous fields
    const { __proto__, constructor, prototype, ...sanitized } = request;
    return sanitized;
  }
}
