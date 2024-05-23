# react-native-dapp-explorer (⚠️Beta)

web3 dapp wallet injector webview for react-native

This package is still under development! CONTRIBUTIONS ARE HIGHLY APPRECIATED!

## Installation

```sh
npm install react-native-dapp-explorer
```

## Usage

```js
import web3wallet from ./web3wallet';
import { Web3View } from 'react-native-dapp-explorer';

function MyApp() {

  const ref = useRef();
  web3wallet.on('session_request', async event => {
      const { topic, params, id } = event
      const { request } = params
      const requestParamsMessage = request.params[0]
    
      // convert `requestParamsMessage` by using a method like hexToUtf8
      const message = hexToUtf8(requestParamsMessage)
    
      // sign the message
      const signedMessage = await wallet.signMessage(message)
    
      const response = { id, result: signedMessage, jsonrpc: '2.0' }
    
      await web3wallet.respondSessionRequest({ topic, response })
    })

  return (
    <Web3InjectedWalletView
      provider={provider}
      chainId={1}
      url="https://your-dapp-url.com"
      style={{ flex: 1, width: '100%' }}
      webviewRef={ref}
    />
  );
}
```


## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
