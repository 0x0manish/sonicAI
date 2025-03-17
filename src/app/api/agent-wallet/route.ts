import { NextRequest, NextResponse } from 'next/server';
import { getAgentWallet, initializeAgentWallet } from '@/lib/agent-wallet';
import { AGENT_WALLET_CONFIG, validateWalletConfig, updateWalletConfigFromEnv } from '@/lib/wallet-config';

export const runtime = 'edge';

/**
 * GET handler for the agent wallet API endpoint
 * @returns A JSON response with the agent wallet's information
 */
export async function GET() {
  try {
    // Update wallet configuration from environment variables
    updateWalletConfigFromEnv();
    
    // Validate wallet configuration
    if (!validateWalletConfig()) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Agent wallet is not properly configured' 
        },
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