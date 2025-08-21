export const CHAIN_CONFIG = {
  baseSepolia: {
    chainId: 84532,
    name: 'Base Sepolia',
    rpcUrl: 'https://sepolia.base.org',
    blockExplorer: 'https://sepolia.basescan.org',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    }
  }
};

export const TOKEN_CONFIG = {
  USDC: {
    baseSepolia: {
      address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      decimals: 6,
      symbol: 'USDC',
      name: 'USD Coin'
    }
  }
};

export const SPONSORSHIP_CONFIG = {
  fixedAmount: {
    USDC: 5,
    USDCUnits: 5000000
  }
};

export function generatePaymentURI(walletAddress, chainId = CHAIN_CONFIG.baseSepolia.chainId) {
  const tokenAddress = TOKEN_CONFIG.USDC.baseSepolia.address;
  const amount = SPONSORSHIP_CONFIG.fixedAmount.USDCUnits;
  
  // For ERC-20 transfers, we need to call the transfer function on the token contract
  // Format: ethereum:<token_contract>@<chainId>/transfer?address=<recipient>&uint256=<amount>
  return `ethereum:${tokenAddress}@${chainId}/transfer?address=${walletAddress}&uint256=${amount}`;
}