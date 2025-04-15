import { URL } from 'url';
import type { WebViewNavigation } from 'react-native-webview';
import EventEmitter from 'eventemitter3';

interface NavigationConfig {
  trustedDomains?: string[];
  maxHistoryLength?: number;
  blockExternalNavigation?: boolean;
  allowedProtocols?: string[];
}

export class NavigationManager extends EventEmitter {
  private history: string[];
  private currentIndex: number;
  private trustedDomains: Set<string>;
  private maxHistoryLength: number;
  private blockExternalNavigation: boolean;
  private allowedProtocols: Set<string>;

  constructor(config: NavigationConfig = {}) {
    super();
    this.history = [];
    this.currentIndex = -1;
    this.trustedDomains = new Set(config.trustedDomains || []);
    this.maxHistoryLength = config.maxHistoryLength || 50;
    this.blockExternalNavigation = config.blockExternalNavigation || false;
    this.allowedProtocols = new Set(config.allowedProtocols || ['https:', 'http:']);
  }

  handleNavigation(navState: WebViewNavigation): boolean {
    const url = new URL(navState.url);

    // Check protocol
    if (!this.allowedProtocols.has(url.protocol)) {
      this.emit('blocked', {
        url: navState.url,
        reason: 'Invalid protocol'
      });
      return false;
    }

    // Check trusted domains if external navigation is blocked
    if (this.blockExternalNavigation && !this.trustedDomains.has(url.hostname)) {
      this.emit('blocked', {
        url: navState.url,
        reason: 'Untrusted domain'
      });
      return false;
    }

    // Handle history
    if (navState.loading) {
      if (this.currentIndex < this.history.length - 1) {
        // Remove forward history if navigating to a new page
        this.history = this.history.slice(0, this.currentIndex + 1);
      }

      this.history.push(navState.url);
      this.currentIndex++;

      // Trim history if it exceeds max length
      if (this.history.length > this.maxHistoryLength) {
        const excess = this.history.length - this.maxHistoryLength;
        this.history = this.history.slice(excess);
        this.currentIndex -= excess;
      }

      this.emit('navigationStateChanged', {
        canGoBack: this.canGoBack(),
        canGoForward: this.canGoForward(),
        currentUrl: this.getCurrentUrl()
      });
    }

    return true;
  }

  addTrustedDomain(domain: string): void {
    this.trustedDomains.add(domain);
  }

  removeTrustedDomain(domain: string): void {
    this.trustedDomains.delete(domain);
  }

  canGoBack(): boolean {
    return this.currentIndex > 0;
  }

  canGoForward(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  goBack(): string | null {
    if (this.canGoBack()) {
      this.currentIndex--;
      const url = this.getCurrentUrl();
      this.emit('navigationStateChanged', {
        canGoBack: this.canGoBack(),
        canGoForward: this.canGoForward(),
        currentUrl: url
      });
      return url;
    }
    return null;
  }

  goForward(): string | null {
    if (this.canGoForward()) {
      this.currentIndex++;
      const url = this.getCurrentUrl();
      this.emit('navigationStateChanged', {
        canGoBack: this.canGoBack(),
        canGoForward: this.canGoForward(),
        currentUrl: url
      });
      return url;
    }
    return null;
  }

  getCurrentUrl(): string | null {
    return this.currentIndex >= 0 ? this.history[this.currentIndex] : null;
  }

  getHistory(): string[] {
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [this.getCurrentUrl()].filter(Boolean) as string[];
    this.currentIndex = this.history.length - 1;
    this.emit('navigationStateChanged', {
      canGoBack: false,
      canGoForward: false,
      currentUrl: this.getCurrentUrl()
    });
  }

  isTrustedDomain(url: string): boolean {
    try {
      const { hostname } = new URL(url);
      return this.trustedDomains.has(hostname);
    } catch {
      return false;
    }
  }
}
