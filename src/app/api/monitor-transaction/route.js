import { NextResponse } from 'next/server';
import { blockchainService } from '../../../lib/blockchain-service';

export async function POST(request) {
  try {
    const { charityAddress, transactionHash } = await request.json();

    if (!charityAddress && !transactionHash) {
      return NextResponse.json({
        error: 'Either charityAddress or transactionHash is required'
      }, { status: 400 });
    }

    if (!blockchainService.isInitialized()) {
      return NextResponse.json({
        error: 'Blockchain service not initialized. Check COINBASE_RPC_API_KEY environment variable.'
      }, { status: 500 });
    }

    // If transaction hash provided, check specific transaction status
    if (transactionHash) {
      const result = await blockchainService.checkTransactionStatus(transactionHash);
      return NextResponse.json(result);
    }

    // If charity address provided, check for recent sponsorship payments
    if (charityAddress) {
      const result = await blockchainService.checkForSponsorshipPayment(charityAddress);
      return NextResponse.json(result);
    }

  } catch (error) {
    console.error('Error in monitor-transaction API:', error);
    return NextResponse.json({
      error: 'Failed to monitor transaction',
      details: error.message
    }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const charityAddress = searchParams.get('charityAddress');
    const transactionHash = searchParams.get('transactionHash');

    if (!charityAddress && !transactionHash) {
      return NextResponse.json({
        error: 'Either charityAddress or transactionHash query parameter is required'
      }, { status: 400 });
    }

    if (!blockchainService.isInitialized()) {
      return NextResponse.json({
        error: 'Blockchain service not initialized. Check COINBASE_RPC_API_KEY environment variable.',
        initialized: false
      }, { status: 500 });
    }

    // Check specific transaction status
    if (transactionHash) {
      const result = await blockchainService.checkTransactionStatus(transactionHash);
      return NextResponse.json({
        ...result,
        initialized: true
      });
    }

    // Check for recent sponsorship payments to charity address
    if (charityAddress) {
      const result = await blockchainService.checkForSponsorshipPayment(charityAddress);
      return NextResponse.json({
        ...result,
        initialized: true,
        charityAddress
      });
    }

  } catch (error) {
    console.error('Error in monitor-transaction API:', error);
    return NextResponse.json({
      error: 'Failed to monitor transaction',
      details: error.message,
      initialized: blockchainService.isInitialized()
    }, { status: 500 });
  }
}