import { NextRequest, NextResponse } from 'next/server';
import { hasWalletSufficientBalance, isValidMintAddress, SOL_MINT, solToLamports } from '@/lib/swap-utils';
import { isValidSonicAddress } from '@/lib/wallet-utils';
import { getAgentWallet, isAgentWalletInitialized, initializeAgentWallet } from '@/lib/agent-wallet';
import { AGENT_WALLET_CONFIG, updateWalletConfigFromEnv, validateWalletConfig } from '@/lib/wallet-config';

export const runtime = 'edge';

/**
 * POST handler for the swap check balance API endpoint
 * @param req The request object
 * @returns A JSON response with the balance check result
 */
export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const { inputMint, amount, wallet } = await req.json();
    
    // Validate input parameters
    if (!inputMint || typeof inputMint !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Input mint is required and must be a string' },
        { status: 400 }
      );
    }
    
    if (amount === undefined || amount === null || isNaN(Number(amount))) {
      return NextResponse.json(
        { success: false, error: 'Amount is required and must be a number' },
        { status: 400 }
      );
    }
    
    // Validate mint address
    if (!isValidMintAddress(inputMint)) {
      return NextResponse.json(
        { success: false, error: 'Invalid input mint address' },
        { status: 400 }
      );
    }
    
    // Determine which wallet to check
    let walletAddress: string;
    
    if (wallet) {
      // If a wallet address is provided, validate it
      if (!isValidSonicAddress(wallet)) {
        return NextResponse.json(
          { success: false, error: 'Invalid wallet address' },
          { status: 400 }
        );
      }
      walletAddress = wallet;
    } else {
      // Otherwise, use the agent wallet
      // Update wallet configuration from environment variables
      updateWalletConfigFromEnv();
      
      // Validate wallet configuration
      if (!validateWalletConfig()) {
        console.error('Agent wallet configuration is invalid');
        return NextResponse.json(
          { 
            success: false, 
            error: 'Agent wallet is not properly configured. Please check your environment variables.' 
          },
          { status: 500 }
        );
      }
      
      // Explicitly initialize the wallet if it's not already initialized
      let agentWallet = getAgentWallet();
      if (!agentWallet) {
        console.log('Agent wallet not initialized, initializing now...');
        agentWallet = initializeAgentWallet(AGENT_WALLET_CONFIG);
        
        if (!agentWallet) {
          console.error('Failed to initialize agent wallet, configuration may be invalid');
          return NextResponse.json(
            { 
              success: false, 
              error: 'Failed to initialize agent wallet. Please check your wallet configuration.' 
            },
            { status: 500 }
          );
        }
        
        console.log('Agent wallet initialized successfully');
      }
      
      try {
        walletAddress = agentWallet.getPublicKey();
        console.log('Using agent wallet address:', walletAddress);
      } catch (walletError) {
        console.error('Error getting agent wallet public key:', walletError);
        return NextResponse.json(
          { 
            success: false, 
            error: 'Failed to get agent wallet public key. Please check your wallet configuration.' 
          },
          { status: 500 }
        );
      }
    }
    
    // Convert amount to lamports if input is SOL
    let amountInLamports = Number(amount);
    if (inputMint === SOL_MINT && amountInLamports < 1_000_000) {
      // If amount is less than 1 million, assume it's in SOL and convert to lamports
      amountInLamports = solToLamports(amountInLamports);
    }
    
    console.log('Checking balance for wallet:', walletAddress, 'amount:', amountInLamports, 'inputMint:', inputMint);
    
    // Check if wallet has sufficient balance
    const balanceCheck = await hasWalletSufficientBalance(
      walletAddress,
      inputMint,
      amountInLamports
    );
    
    console.log('Balance check result:', balanceCheck);
    
    // Return the result
    return NextResponse.json({
      success: true,
      walletAddress,
      sufficient: balanceCheck.sufficient,
      error: balanceCheck.error
    });
  } catch (error) {
    console.error('Error checking wallet balance:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to check wallet balance: ${error instanceof Error ? error.message : 'Unknown error'}` 
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler for the swap check balance API endpoint
 * @param req The request object
 * @returns A JSON response with the balance check result
 */
export async function GET(req: NextRequest) {
  try {
    // Get query parameters
    const url = new URL(req.url);
    const inputMint = url.searchParams.get('inputMint');
    const amount = url.searchParams.get('amount');
    const wallet = url.searchParams.get('wallet');
    
    // Validate input parameters
    if (!inputMint) {
      return NextResponse.json(
        { success: false, error: 'Input mint is required' },
        { status: 400 }
      );
    }
    
    if (!amount) {
      return NextResponse.json(
        { success: false, error: 'Amount is required' },
        { status: 400 }
      );
    }
    
    // Validate mint address
    if (!isValidMintAddress(inputMint)) {
      return NextResponse.json(
        { success: false, error: 'Invalid input mint address' },
        { status: 400 }
      );
    }
    
    // Determine which wallet to check
    let walletAddress: string;
    
    if (wallet) {
      // If a wallet address is provided, validate it
      if (!isValidSonicAddress(wallet)) {
        return NextResponse.json(
          { success: false, error: 'Invalid wallet address' },
          { status: 400 }
        );
      }
      walletAddress = wallet;
    } else {
      // Otherwise, use the agent wallet
      // Update wallet configuration from environment variables
      updateWalletConfigFromEnv();
      
      // Validate wallet configuration
      if (!validateWalletConfig()) {
        console.error('Agent wallet configuration is invalid');
        return NextResponse.json(
          { 
            success: false, 
            error: 'Agent wallet is not properly configured. Please check your environment variables.' 
          },
          { status: 500 }
        );
      }
      
      // Explicitly initialize the wallet if it's not already initialized
      let agentWallet = getAgentWallet();
      if (!agentWallet) {
        console.log('Agent wallet not initialized, initializing now...');
        agentWallet = initializeAgentWallet(AGENT_WALLET_CONFIG);
        
        if (!agentWallet) {
          console.error('Failed to initialize agent wallet, configuration may be invalid');
          return NextResponse.json(
            { 
              success: false, 
              error: 'Failed to initialize agent wallet. Please check your wallet configuration.' 
            },
            { status: 500 }
          );
        }
        
        console.log('Agent wallet initialized successfully');
      }
      
      try {
        walletAddress = agentWallet.getPublicKey();
        console.log('Using agent wallet address:', walletAddress);
      } catch (walletError) {
        console.error('Error getting agent wallet public key:', walletError);
        return NextResponse.json(
          { 
            success: false, 
            error: 'Failed to get agent wallet public key. Please check your wallet configuration.' 
          },
          { status: 500 }
        );
      }
    }
    
    // Convert amount to lamports if input is SOL
    let amountInLamports = Number(amount);
    if (inputMint === SOL_MINT && amountInLamports < 1_000_000) {
      // If amount is less than 1 million, assume it's in SOL and convert to lamports
      amountInLamports = solToLamports(amountInLamports);
    }
    
    console.log('Checking balance for wallet:', walletAddress, 'amount:', amountInLamports, 'inputMint:', inputMint);
    
    // Check if wallet has sufficient balance
    const balanceCheck = await hasWalletSufficientBalance(
      walletAddress,
      inputMint,
      amountInLamports
    );
    
    console.log('Balance check result:', balanceCheck);
    
    // Return the result
    return NextResponse.json({
      success: true,
      walletAddress,
      sufficient: balanceCheck.sufficient,
      error: balanceCheck.error
    });
  } catch (error) {
    console.error('Error checking wallet balance:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to check wallet balance: ${error instanceof Error ? error.message : 'Unknown error'}` 
      },
      { status: 500 }
    );
  }
} 