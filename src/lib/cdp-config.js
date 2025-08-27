// Coinbase Developer Platform configuration for embedded wallets

export const CDP_CONFIG = {
  projectId: process.env.NEXT_PUBLIC_CDP_PROJECT_ID,
  // Optional: Configure specific networks (defaults to Base)
  networks: {
    base: {
      chainId: 8453, // Base mainnet
      name: 'Base',
      currency: 'ETH',
      rpcUrls: ['https://mainnet.base.org']
    },
    baseSepolia: {
      chainId: 84532, // Base Sepolia testnet
      name: 'Base Sepolia',
      currency: 'ETH', 
      rpcUrls: ['https://sepolia.base.org']
    }
  },
  // Default to Base Sepolia for development
  defaultNetwork: process.env.NODE_ENV === 'production' ? 'base' : 'baseSepolia'
};

export const APP_CONFIG = {
  appName: 'CryptoRunner',
  appDescription: 'Support charities with your Strava activities',
  appUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
};