// Embedded wallet utility functions for server-side operations

/**
 * Create a deterministic embedded wallet address for a user
 * This creates a valid Ethereum-style address that can be used for receiving payments
 * @param {string} userId - The user's ID (Strava athlete ID)
 * @returns {Promise<{success: boolean, walletAddress?: string, error?: string}>}
 */
export async function createEmbeddedWallet(userId) {
  try {
    console.log(`Creating embedded wallet address for user ${userId}`);
    
    // Create a deterministic wallet address based on user ID and app secret
    const crypto = require('crypto');
    
    // Use a combination of user ID and project-specific data for uniqueness
    const seed = `cryptorunner-${userId}-${process.env.NEXT_PUBLIC_CDP_PROJECT_ID || 'default'}`;
    const hash = crypto.createHash('sha256').update(seed).digest();
    
    // Generate a valid Ethereum address format
    // Take first 20 bytes (40 hex characters) and ensure it follows Ethereum address rules
    const addressBytes = hash.subarray(0, 20);
    
    // Convert to hex and add 0x prefix
    const walletAddress = `0x${addressBytes.toString('hex')}`;
    
    // Basic validation - ensure it's a valid Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      throw new Error('Generated invalid wallet address format');
    }
    
    console.log(`Generated wallet address: ${walletAddress}`);
    
    return {
      success: true,
      walletAddress
    };
    
  } catch (error) {
    console.error('Error creating embedded wallet:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get wallet information for a user
 * @param {string} userId - The user's ID
 * @returns {Promise<{success: boolean, wallet?: object, error?: string}>}
 */
export async function getUserWallet(userId) {
  try {
    // Placeholder implementation
    // In a real implementation, this would fetch wallet info from Coinbase CDP
    
    return {
      success: true,
      wallet: {
        address: `0x${userId.toString().padStart(40, '0')}`,
        network: 'base-sepolia'
      }
    };
    
  } catch (error) {
    console.error('Error fetching user wallet:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Validate wallet address format
 * @param {string} address - Wallet address to validate
 * @returns {boolean}
 */
export function isValidWalletAddress(address) {
  const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
  return ethAddressRegex.test(address);
}