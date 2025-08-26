import { ethers } from 'ethers';
import { CHAIN_CONFIG, TOKEN_CONFIG, SPONSORSHIP_CONFIG } from './chain-config';

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];

export class BlockchainService {
  constructor() {
    this.provider = null;
    this.usdcContract = null;
    this.initProvider();
  }

  initProvider() {
    try {
      const apiKey = process.env.COINBASE_RPC_API_KEY;
      if (!apiKey) {
        console.warn('COINBASE_RPC_API_KEY not found in environment variables');
        return;
      }

      const rpcUrl = `${CHAIN_CONFIG.baseSepolia.coinbaseRpcUrl}${apiKey}`;
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      
      this.usdcContract = new ethers.Contract(
        TOKEN_CONFIG.USDC.baseSepolia.address,
        ERC20_ABI,
        this.provider
      );
    } catch (error) {
      console.error('Failed to initialize blockchain provider:', error);
    }
  }

  async checkTransactionStatus(txHash) {
    if (!this.provider) {
      throw new Error('Blockchain provider not initialized');
    }

    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      
      if (!receipt) {
        return { status: 'pending', receipt: null };
      }

      if (receipt.status === 1) {
        return { status: 'completed', receipt };
      } else {
        return { status: 'failed', receipt };
      }
    } catch (error) {
      console.error('Error checking transaction status:', error);
      return { status: 'error', error: error.message };
    }
  }

  async getUSDCTransfers(address, fromBlock = 'latest') {
    if (!this.provider || !this.usdcContract) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      // Normalize address to proper checksum format
      let checksummedAddress;
      try {
        checksummedAddress = ethers.getAddress(address);
      } catch (addressError) {
        throw new Error(`Invalid wallet address format: ${address}`);
      }
      
      const filter = this.usdcContract.filters.Transfer(null, checksummedAddress);
      const events = await this.usdcContract.queryFilter(filter, fromBlock);
      
      return events.map(event => ({
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        from: event.args[0],
        to: event.args[1],
        amount: event.args[2].toString(),
        timestamp: null // Will need to fetch block to get timestamp
      }));
    } catch (error) {
      console.error('Error fetching USDC transfers:', error);
      throw error;
    }
  }

  async checkForSponsorshipPayment(charityAddress, expectedAmount = SPONSORSHIP_CONFIG.fixedAmount.USDCUnits) {
    if (!this.provider || !this.usdcContract) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      const currentBlock = await this.provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 100); // Check last 100 blocks
      
      const transfers = await this.getUSDCTransfers(charityAddress, fromBlock);
      
      const recentSponsorships = transfers.filter(transfer => 
        transfer.amount === expectedAmount.toString()
      );

      if (recentSponsorships.length > 0) {
        const latest = recentSponsorships[0];
        const block = await this.provider.getBlock(latest.blockNumber);
        
        return {
          found: true,
          transaction: {
            ...latest,
            timestamp: block.timestamp
          }
        };
      }

      return { found: false };
    } catch (error) {
      console.error('Error checking for sponsorship payment:', error);
      throw error;
    }
  }

  async getBlockTimestamp(blockNumber) {
    if (!this.provider) {
      throw new Error('Blockchain provider not initialized');
    }

    try {
      const block = await this.provider.getBlock(blockNumber);
      return block ? block.timestamp : null;
    } catch (error) {
      console.error('Error fetching block timestamp:', error);
      return null;
    }
  }

  isInitialized() {
    return this.provider !== null && this.usdcContract !== null;
  }
}

export const blockchainService = new BlockchainService();