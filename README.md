# react-native-dapp-explorer (⚠️Beta)

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
      chainId={1}
      url="https://your-dapp-url.com"
      style={{ flex: 1, width: '100%' }}
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
