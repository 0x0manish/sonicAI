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
    console.log('Starting agent wallet API request...');
    
    // Update wallet configuration from environment variables
    console.log('Updating wallet configuration from environment...');
    updateWalletConfigFromEnv();
    
    // Validate wallet configuration
    console.log('Validating wallet configuration...');
    if (!validateWalletConfig()) {
      console.error('Wallet configuration validation failed');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Agent wallet is not properly configured. Check server logs for details.' 
        },
        { status: 500 }
      );
    }
    
    // Get or initialize agent wallet
    console.log('Getting or initializing agent wallet...');
    let agentWallet = getAgentWallet();
    if (!agentWallet) {
      console.log('Initializing new agent wallet...');
      agentWallet = initializeAgentWallet(AGENT_WALLET_CONFIG);
      
      // If still null after initialization, return error
      if (!agentWallet) {
        console.error('Failed to initialize agent wallet');
        return NextResponse.json(
          { 
            success: false, 
            error: 'Failed to initialize agent wallet. Check server logs for details.' 
          },
          { status: 500 }
        );
      }
      console.log('Agent wallet initialized successfully');
    }
    
    // Get wallet info
    console.log('Getting wallet information...');
    const publicKey = agentWallet.getPublicKey();
    console.log('Public key:', publicKey);
    
    console.log('Getting mainnet balance...');
    const balance = await agentWallet.getBalance();
    console.log('Mainnet balance:', balance);
    
    console.log('Getting testnet balance...');
    const testnetBalance = await agentWallet.getTestnetBalance();
    console.log('Testnet balance:', testnetBalance);
    
    const networkInfo = agentWallet.getNetworkInfo();
    console.log('Network info:', networkInfo);
    
    // Return wallet info
    return NextResponse.json({
      success: true,
      publicKey,
      balance,
      testnetBalance,
      networkInfo
    });
  } catch (error) {
    console.error('Error in agent wallet API:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get agent wallet info. Please try again later.' 
      },
      { status: 500 }
    );
  }
} 