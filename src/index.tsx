import React, { useRef, useEffect, useState } from 'react';
import { WebView } from 'react-native-webview';

const Web3View = ({ provider, address, url }) => {
    const webViewRef = useRef(null);
    const [injectedJavaScript, setInjectedJavaScript] = useState(null);

    const handleMessage = async (event) => {
        const { method, params, id } = JSON.parse(event.nativeEvent.data);

        try {
            let result;
            switch (method) {
                case 'eth_accounts':
                    result = [address];
                    break;
                case 'eth_requestAccounts':
                    result = [address];
                    break;
                case 'eth_chainId':
                    result = await provider.getNetwork().then(net => net.chainId.toString(16));
                    break;
                case 'wallet_switchEthereumChain':
                    if (provider && typeof provider.request === 'function') {
                        result = await provider.request({
                            method: 'wallet_switchEthereumChain',
                            params: [{ chainId: params[0].chainId }],
                        });
                    } else {
                        throw new Error("Chain switching is not supported by the provided provider.");
                    }
                    break;
                case 'personal_sign':
                    result = await provider.signMessage(params[0]);
                    break;
                case 'eth_call':
                    result = await provider.call(params[0]);
                    break;
                // ... Add other methods as needed
                default:
                    throw new Error("Unsupported method: " + method);
            }

            webViewRef.current.postMessage(JSON.stringify({ id, result }));
        } catch (error) {
            webViewRef.current.postMessage(JSON.stringify({ id, error: error.message }));
        }
    };

    useEffect(() => {
        const injectedScript = `
            window.ethereum = {
                sendAsync: function(payload, callback) {
                    const messageId = Math.random().toString(36).substr(2);
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        id: messageId,
                        method: payload.method,
                        params: payload.params
                    }));
                    window.addEventListener(messageId, function(event) {
                        const data = JSON.parse(event.data);
                        if (data.error) {
                            callback(data.error, null);
                        } else {
                            callback(null, {
                                id: payload.id,
                                jsonrpc: "2.0",
                                result: data.result
                            });
                        }
                    });
                },
                // ... Other methods and properties can be similarly defined
            };
            window.web3 = { currentProvider: window.ethereum };
        `;

        setInjectedJavaScript(injectedScript);
    }, [address]);

    return (
        <WebView
            ref={webViewRef}
            source={{ uri: url }}
            style={{ flex: 1, width: '100%' }}
            startInLoadingState={true}
            javaScriptEnabledAndroid={true}
            onMessage={handleMessage}
            injectedJavaScript={injectedJavaScript}
        />
    );
};

export default Web3View;
