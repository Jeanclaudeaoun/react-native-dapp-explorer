export class Web3ViewError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'Web3ViewError';
  }
}

export class ProviderError extends Web3ViewError {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderError';
  }
}

export class SecurityError extends Web3ViewError {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

export class ConnectionError extends Web3ViewError {
  constructor(message: string) {
    super(message);
    this.name = 'ConnectionError';
  }
}

export class TransactionError extends Web3ViewError {
  constructor(message: string) {
    super(message);
    this.name = 'TransactionError';
  }
}

export class SigningError extends Web3ViewError {
  constructor(message: string) {
    super(message);
    this.name = 'SigningError';
  }
}