# react-native-dapp-explorer

web3 dapp wallet injector webview for react-native

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

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
