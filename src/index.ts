// Main component
export { Web3View } from './Web3View';
export type { Web3ViewProps } from './Web3View';

// Provider types
export type { 
  SolanaProvider,
  EthereumProvider,
  SolanaCluster
} from './types';

// Error types
export { 
  Web3ViewError,
  ProviderError,
  SecurityError 
} from './core/errors';