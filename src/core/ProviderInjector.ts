export class ProviderInjector {
  static injectBridgeScript(): string {
    return `
      window.bridge = {
        callbacks: new Map(),
        messageQueue: [],
        nextMessageId: 1,

        postMessage(data) {
          return new Promise((resolve, reject) => {
            const id = this.nextMessageId++;
            this.callbacks.set(id, { resolve, reject });
            window.ReactNativeWebView.postMessage(JSON.stringify({
              id,
              ...JSON.parse(data)
            }));
          });
        },

        handleResponse(response) {
          const callback = this.callbacks.get(response.id);
          if (callback) {
            if (response.error) {
              callback.reject(response.error);
            } else {
              callback.resolve(response.result);
            }
            this.callbacks.delete(response.id);
          }
        }
      };
    `;
  }

  static injectEthereumProvider(): string {
    return `
      (function() {
        if (window.ethereum) return;

        function createMetaMaskProvider() {
          const provider = {
            isMetaMask: true,
            _metamask: { isUnlocked: true },
            chainId: null,
            selectedAddress: null,
            isConnected: () => true,
            
            request: async ({ method, params }) => {
              const response = await window.bridge.postMessage(JSON.stringify({
                type: 'ethereum',
                method,
                params
              }));
              return JSON.parse(response);
            },

            on: function(eventName, handler) {
              window.addEventListener(\`ethereum_\${eventName}\`, (event) => {
                handler(event.detail);
              });
            },

            removeListener: function(eventName, handler) {
              window.removeEventListener(\`ethereum_\${eventName}\`, handler);
            }
          };

          // Add legacy methods
          provider.enable = () => provider.request({ method: 'eth_requestAccounts' });
          provider.send = provider.request;
          provider.sendAsync = (payload, callback) => {
            provider.request(payload)
              .then(result => callback(null, { id: payload.id, result }))
              .catch(error => callback(error));
          };

          return provider;
        }

        window.ethereum = createMetaMaskProvider();
        window.dispatchEvent(new Event('ethereum#initialized'));
      })();
    `;
  }

  static injectSolanaProvider(): string {
    return `
      (function() {
        if (window.solana) return;

        function createSolanaProvider() {
          const provider = {
            isWalletKit: true,
            isAppKit: true,
            publicKey: null,
            isConnected: true,
            autoApprove: false,

            async connect() {
              const response = await window.bridge.postMessage(JSON.stringify({
                type: 'solana',
                method: 'connect'
              }));
              const { publicKey } = JSON.parse(response);
              this.publicKey = { toBase58: () => publicKey };
              return { publicKey: this.publicKey };
            },

            async disconnect() {
              this.publicKey = null;
              window.dispatchEvent(new Event('disconnect'));
            },

            async signTransaction(transaction) {
              const response = await window.bridge.postMessage(JSON.stringify({
                type: 'solana',
                method: 'signTransaction',
                params: { transaction }
              }));
              return JSON.parse(response);
            },

            async signAllTransactions(transactions) {
              const response = await window.bridge.postMessage(JSON.stringify({
                type: 'solana',
                method: 'signAllTransactions',
                params: { transactions }
              }));
              return JSON.parse(response);
            },

            async signMessage(message, display = 'utf8') {
              const response = await window.bridge.postMessage(JSON.stringify({
                type: 'solana',
                method: 'signMessage',
                params: { message, display }
              }));
              return JSON.parse(response);
            }
          };

          return provider;
        }

        const solanaProvider = createSolanaProvider();
        window.solana = solanaProvider;
        window.phantom = { solana: solanaProvider };
        window.dispatchEvent(new Event('solana#initialized'));
      })();
    `;
  }
}