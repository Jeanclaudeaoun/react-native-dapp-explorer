import { ProviderRpcError } from './provider-utils';

interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 5000,
};

export class NetworkManager {
  private retryConfig: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    let lastError: Error | null = null;
    let delay = this.retryConfig.baseDelay;

    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        // Don't retry user rejection or invalid input errors
        if (error.code === 4001 || error.code === -32602) {
          throw error;
        }

        if (attempt === this.retryConfig.maxAttempts) {
          break;
        }

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * 2, this.retryConfig.maxDelay);
      }
    }

    throw new ProviderRpcError({
      code: -32603,
      message: `${context} failed after ${this.retryConfig.maxAttempts} attempts`,
      data: lastError
    });
  }

  static isNetworkError(error: any): boolean {
    return (
      error.message?.includes('network') ||
      error.message?.includes('timeout') ||
      error.message?.includes('connection') ||
      error.code === 'NETWORK_ERROR'
    );
  }
}
