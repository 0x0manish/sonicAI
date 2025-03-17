import { NextRequest, NextResponse } from 'next/server';
import { getAgentWallet, initializeAgentWallet, formatTransactionResult } from '@/lib/agent-wallet';
import { AGENT_WALLET_CONFIG, validateWalletConfig, updateWalletConfigFromEnv } from '@/lib/wallet-config';
import { isValidSonicAddress } from '@/lib/wallet-utils';

export const runtime = 'edge';

/**
 * POST handler for the transaction API endpoint
 * @param req The incoming request
 * @returns A JSON response with the transaction result
 */
export async function POST(req: NextRequest) {
  try {
    // Update wallet configuration from environment variables
    updateWalletConfigFromEnv();
    
    // Parse request body
    const body = await req.json();
    const { recipient, amount, forceMainnet } = body;
    
    // Validate request parameters
    if (!recipient) {
      return NextResponse.json(
        { success: false, error: 'Recipient address is required' },
        { status: 400 }
      );
    }
    
    if (!isValidSonicAddress(recipient)) {
      return NextResponse.json(
        { success: false, error: 'Invalid recipient address format' },
        { status: 400 }
      );
    }
    
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }
    
    // Validate wallet configuration
    if (!validateWalletConfig()) {
      return NextResponse.json(
        { success: false, error: 'Agent wallet is not properly configured' },
        { status: 500 }
      );
    }
    
    // Get or initialize agent wallet
    let agentWallet = getAgentWallet();
    if (!agentWallet) {
      agentWallet = initializeAgentWallet(AGENT_WALLET_CONFIG);
      
      // If still null after initialization, return error
      if (!agentWallet) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Failed to initialize agent wallet' 
          },
          { status: 500 }
        );
      }
    }
    
    // Get network info
    const networkInfo = agentWallet.getNetworkInfo();
    
    // Prevent sending on mainnet unless explicitly forced
    if (!networkInfo.isTestnet && !forceMainnet) {
      return NextResponse.json({
        success: false,
        error: 'Sending SOL on mainnet is disabled for security reasons',
        networkInfo
      });
    }
    
    // Send transaction
    const result = await agentWallet.sendSol(recipient, Number(amount), Boolean(forceMainnet));
    
    // Return result
    return NextResponse.json({
      success: result.success,
      signature: result.signature,
      error: result.error,
      recipient,
      amount: Number(amount),
      networkInfo,
      formattedResult: formatTransactionResult(result, recipient, Number(amount))
    });
  } catch (error) {
    console.error('Error processing transaction:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to process transaction. Please try again later.' 
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler for the transaction API endpoint
 * @returns A JSON response with the agent wallet's public key and balance
 */
export async function GET() {
  try {
    // Update wallet configuration from environment variables
    updateWalletConfigFromEnv();
    
    // Validate wallet configuration
    if (!validateWalletConfig()) {
      return NextResponse.json(
        { success: false, error: 'Agent wallet is not properly configured' },
        { status: 500 }
      );
    }
    
    // Get or initialize agent wallet
    let agentWallet = getAgentWallet();
    if (!agentWallet) {
      agentWallet = initializeAgentWallet(AGENT_WALLET_CONFIG);
      
      // If still null after initialization, return error
      if (!agentWallet) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Failed to initialize agent wallet' 
          },
          { status: 500 }
        );
      }
    }
    
    // Get wallet info
    const publicKey = agentWallet.getPublicKey();
    const balance = await agentWallet.getBalance();
    const testnetBalance = await agentWallet.getTestnetBalance();
    const networkInfo = agentWallet.getNetworkInfo();
    
    // Return wallet info
    return NextResponse.json({
      success: true,
      publicKey,
      balance,
      testnetBalance,
      networkInfo
    });
  } catch (error) {
    console.error('Error getting agent wallet info:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get agent wallet info. Please try again later.' 
      },
      { status: 500 }
    );
  }
} 