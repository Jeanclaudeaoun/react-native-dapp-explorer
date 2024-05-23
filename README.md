# react-native-dapp-explorer (⚠️Beta)

web3 dapp wallet injector webview for react-native

This package is still under development! CONTRIBUTIONS ARE HIGHLY APPRECIATED!

## Installation

```sh
npm install react-native-dapp-explorer
```

## Usage

```js
import provider from ./web3wallet';
import { Web3View } from 'react-native-dapp-explorer';

function MyApp() {

  const ref = useRef();

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
