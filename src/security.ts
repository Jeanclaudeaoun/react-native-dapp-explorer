interface SecurityConfig {
  trustedDomains?: string[];
  allowedMethods?: string[];
}

const DEFAULT_ALLOWED_METHODS = [
  'eth_accounts',
  'eth_requestAccounts',
  'eth_chainId',
  'eth_sendTransaction',
  'personal_sign',
  'eth_sign',
  'eth_signTypedData',
  'eth_signTypedData_v4',
  'wallet_switchEthereumChain'
];

export class SecurityManager {
  private trustedDomains: Set<string>;
  private allowedMethods: Set<string>;

  constructor(config: SecurityConfig = {}) {
    this.trustedDomains = new Set(config.trustedDomains);
    this.allowedMethods = new Set(config.allowedMethods || DEFAULT_ALLOWED_METHODS);
  }

  isTrustedDomain(url: string): boolean {
    if (this.trustedDomains.size === 0) return true;
    try {
      const { hostname } = new URL(url);
      return this.trustedDomains.has(hostname);
    } catch {
      return false;
    }
  }

  isAllowedMethod(method: string): boolean {
    return this.allowedMethods.has(method);
  }

  validateRequest(url: string, method: string): void {
    if (!this.isTrustedDomain(url)) {
      throw new Error('Untrusted domain');
    }
    if (!this.isAllowedMethod(method)) {
      throw new Error(`Method ${method} not allowed`);
    }
  }
}
