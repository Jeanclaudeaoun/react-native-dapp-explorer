declare module 'react-native-webview' {
  import { Component } from 'react'
  import { ViewProps } from 'react-native'

  export interface WebViewProps extends ViewProps {
    source: { uri: string } | { html: string }
    onMessage?: (event: { nativeEvent: { data: string } }) => void
    injectedJavaScriptBeforeContentLoaded?: string
    injectedJavaScript?: string
    onLoadStart?: () => void
    onLoadEnd?: () => void
    javaScriptEnabled?: boolean
    domStorageEnabled?: boolean
    startInLoadingState?: boolean
    allowsInlineMediaPlayback?: boolean
    mediaPlaybackRequiresUserAction?: boolean
    allowsBackForwardNavigationGestures?: boolean
  }

  export class WebView extends Component<WebViewProps> {
    injectJavaScript(script: string): void
  }
}
