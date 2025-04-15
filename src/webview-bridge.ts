import EventEmitter from 'eventemitter3';
import { TransactionSignature } from '@solana/web3.js';

interface BridgeCallback {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
}

interface BridgeMessage {
  id: string;
  type: string;
  method?: string;
  params?: any;
}

export class WebViewBridge extends EventEmitter {
  private callbacks: Map<string, BridgeCallback>;
  private connectedDomain: string | null;
  private lastSignature: TransactionSignature | null;

  constructor() {
    super();
    this.callbacks = new Map();
    this.connectedDomain = null;
    this.lastSignature = null;
  }

  injectScript(): string {
    return `
      (function() {
        window.bridge = {
          _callbacks: new Map(),
          _messageQueue: [],
          _initialized: false,
          _processingQueue: false,

          init: function() {
            if (this._initialized) return;
            this._initialized = true;
            this._processMessageQueue();
          },

          postMessage: async function(message) {
            return new Promise((resolve, reject) => {
              const id = Date.now().toString() + Math.random().toString(36).slice(2);
              this._callbacks.set(id, { resolve, reject });
              
              const wrappedMessage = {
                id,
                ...message,
                origin: window.location.origin
              };

              window.ReactNativeWebView.postMessage(JSON.stringify(wrappedMessage));
            });
          },

          handleResponse: function(response) {
            const callback = this._callbacks.get(response.id);
            if (callback) {
              if (response.error) {
                callback.reject(response.error);
              } else {
                callback.resolve(response.result);
              }
              this._callbacks.delete(response.id);
            }
          },

          _processMessageQueue: function() {
            if (this._processingQueue) return;
            this._processingQueue = true;

            const processNext = () => {
              if (this._messageQueue.length > 0) {
                const { message, resolve, reject } = this._messageQueue.shift();
                this.postMessage(message)
                  .then(resolve)
                  .catch(reject)
                  .finally(() => setTimeout(processNext, 0));
              } else {
                this._processingQueue = false;
              }
            };

            processNext();
          },

          queueMessage: function(message) {
            return new Promise((resolve, reject) => {
              this._messageQueue.push({ message, resolve, reject });
              if (!this._processingQueue) {
                this._processMessageQueue();
              }
            });
          },

          // Helper methods for common Solana operations
          connectPhantom: function() {
            return this.postMessage({
              type: 'solanaRequest',
              method: 'connect'
            });
          },

          signTransaction: function(transaction) {
            return this.postMessage({
              type: 'solanaSignTransaction',
              params: { transaction }
            });
          },

          signAllTransactions: function(transactions) {
            return this.postMessage({
              type: 'solanaSignAllTransactions',
              params: { transactions }
            });
          },

          signMessage: function(message, display = 'utf8') {
            return this.postMessage({
              type: 'solanaSignMessage',
              params: { message, display }
            });
          }
        };

        // Initialize bridge
        window.bridge.init();

        // Notify that bridge is ready
        window.dispatchEvent(new Event('bridge#initialized'));
      })();
    `;
  }

  handleMessage(message: BridgeMessage): void {
    const callback = this.callbacks.get(message.id);
    if (callback) {
      if ('error' in message) {
        callback.reject(new Error(message.error));
      } else {
        callback.resolve(message);
      }
      this.callbacks.delete(message.id);
    }

    // Emit events for external listeners
    this.emit(message.type, message);
  }

  setConnectedDomain(domain: string): void {
    this.connectedDomain = domain;
    this.emit('domainChanged', domain);
  }

  setLastSignature(signature: TransactionSignature): void {
    this.lastSignature = signature;
    this.emit('signatureUpdated', signature);
  }

  getLastSignature(): TransactionSignature | null {
    return this.lastSignature;
  }

  getConnectedDomain(): string | null {
    return this.connectedDomain;
  }

  clearState(): void {
    this.connectedDomain = null;
    this.lastSignature = null;
    this.callbacks.clear();
    this.emit('stateCleared');
  }
}
