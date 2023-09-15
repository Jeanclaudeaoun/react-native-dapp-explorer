# react-native-dapp-explorer (⚠️WIP)

web3 dapp wallet injector webview for react-native

This package is still under development! CONTRIBUTIONS ARE HIGHLY APPRECIATED!

## Installation

```sh
npm install react-native-dapp-explorer
```

## Usage

```js
import Web3 from 'web3';
import Web3View from 'react-native-dapp-explorer';

const web3 = new Web3(window.ethereum);
const accounts = await web3.eth.getAccounts();

function MyApp() {
  return (
    <Web3View
      provider={web3.currentProvider}
      address={accounts[0]}
      url="https://your-dapp-url.com"
    />
  );
}
```

## original working code
```
import React, { useEffect, useState } from 'react';
import { WebView } from 'react-native-webview';

const Web3View = ({address, url}) => {
    const [injectedJavaScript, setInjectedJavaScript] = useState(null);

  useEffect(() => {
    const injectedScript = `
        console.log("Injected script running...");
        window.ReactNativeWebView.postMessage("Injected script started!");

        window.ethereum = {
            isMetaMask: true,
            isConnected: () => true,
            chainId: '0x1',
            selectedAddress: '${address}',
            request: function({ method, params }) {
                window.ReactNativeWebView.postMessage("DApp requested method: " + method + ", Params: " + JSON.stringify(params));

                switch (method) {
                    case 'eth_accounts':
                        return Promise.resolve([ '${address}' ]);
                    case 'eth_requestAccounts':
                        return Promise.resolve([ '${address}' ]);
                    case 'eth_chainId':
                        return Promise.resolve('0x1');  // Ethereum Mainnet
                    case 'eth_blockNumber':
                        return Promise.resolve('0x5BAD55'); // Mock block number
                    case 'eth_call':
                        // Log params and potentially mock response based on it
                        console.log("eth_call with params:", params);
                        return Promise.reject("eth_call not implemented yet.");
                    default:
                        console.error("Unhandled method call from DApp:", method);
                        return Promise.reject(new Error("Unhandled method: " + method));
                }
            },
            enable: async function() {
                return ['${address}'];
            }
        };

        window.web3 = { currentProvider: window.ethereum };

        true;  // ensure the injected script doesn't return a value
    `;

    setInjectedJavaScript(injectedScript);
}, [address]);

    return (<WebView
            source={{ uri: url }}
            style={{ flex: 1, width: '100%' }}
            startInLoadingState={true}
            javaScriptEnabledAndroid={true}
            onMessage={(event) => {
                console.log('Message from WebView:', event.nativeEvent.data);
            }}
            injectedJavaScript={injectedJavaScript}
        />)
};

export default Web3View;
```

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
