import { URL } from 'url';
import EventEmitter from 'eventemitter3';

interface DeepLinkConfig {
  schemes: string[];
  debug?: boolean;
}

export class DeepLinkManager extends EventEmitter {
  private schemes: Set<string>;
  private debug: boolean;

  constructor(config: DeepLinkConfig) {
    super();
    this.schemes = new Set(config.schemes);
    this.debug = config.debug || false;
  }

  handleUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      
      if (!this.schemes.has(parsedUrl.protocol.replace(':', ''))) {
        return false;
      }

      switch (parsedUrl.protocol) {
        case 'solana:': {
          this.handleSolanaProtocol(parsedUrl);
          return true;
        }
        case 'phantom:': {
          this.handlePhantomProtocol(parsedUrl);
          return true;
        }
        case 'wc:': {
          this.handleWalletConnectProtocol(parsedUrl);
          return true;
        }
      }
    } catch (error) {
      if (this.debug) {
        console.error('Deep link error:', error);
      }
    }
    return false;
  }

  private handleSolanaProtocol(url: URL): void {
    // Extract transaction data if present
    const txData = url.searchParams.get('tx');
    if (txData) {
      this.emit('solanaTransaction', {
        type: 'transaction',
        data: txData
      });
      return;
    }

    // Handle sign message requests
    const message = url.searchParams.get('message');
    if (message) {
      this.emit('solanaMessage', {
        type: 'message',
        data: message
      });
      return;
    }

    // Handle connect requests
    if (url.pathname === '/connect') {
      this.emit('solanaConnect', {
        type: 'connect',
        data: {
          origin: url.searchParams.get('origin'),
          redirect: url.searchParams.get('redirect')
        }
      });
      return;
    }
  }

  private handlePhantomProtocol(url: URL): void {
    // Handle Phantom-specific deep links
    const action = url.pathname.replace('/', '');

    switch (action) {
      case 'connect': {
        this.emit('phantomConnect', {
          type: 'connect',
          data: {
            dapp: url.searchParams.get('dapp'),
            redirect: url.searchParams.get('redirect')
          }
        });
        break;
      }
      case 'transfer': {
        this.emit('phantomTransfer', {
          type: 'transfer',
          data: {
            recipient: url.searchParams.get('recipient'),
            amount: url.searchParams.get('amount'),
            splToken: url.searchParams.get('splToken')
          }
        });
        break;
      }
      case 'sign': {
        this.emit('phantomSign', {
          type: 'sign',
          data: {
            message: url.searchParams.get('message'),
            redirect: url.searchParams.get('redirect')
          }
        });
        break;
      }
    }
  }

  private handleWalletConnectProtocol(url: URL): void {
    // Handle WalletConnect v2 protocol
    const uri = url.href;
    this.emit('walletConnect', {
      type: 'connect',
      data: { uri }
    });
  }

  addScheme(scheme: string): void {
    this.schemes.add(scheme.replace(':', ''));
  }

  removeScheme(scheme: string): void {
    this.schemes.delete(scheme.replace(':', ''));
  }

  getSchemes(): string[] {
    return Array.from(this.schemes);
  }

  getSupportedUrlPattern(): string {
    return Array.from(this.schemes)
      .map(scheme => `${scheme}://*`)
      .join(' ');
  }
}
