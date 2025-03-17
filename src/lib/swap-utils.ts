import { isValidSonicAddress } from './wallet-utils';
import { PublicKey } from '@solana/web3.js';

// Constants
export const SOL_MINT = 'So11111111111111111111111111111111111111112';
export const LAMPORTS_PER_SOL = 1_000_000_000;

// Interfaces
export interface SwapComputeParams {
  inputMint: string;
  outputMint: string;
  amount: number; // In lamports for SOL, or raw amount for tokens
  slippageBps: number;
}

export interface SwapRoute {
  poolId: string;
  inputMint: string;
  outputMint: string;
  feeMint: string;
  feeRate: number;
  feeAmount: string;
  remainingAccounts: any[];
}

export interface SwapComputeResponse {
  success: boolean;
  error?: string;
  data?: {
    swapType: string;
    inputMint: string;
    inputAmount: string;
    outputMint: string;
    outputAmount: string;
    otherAmountThreshold: string;
    slippageBps: number;
    priceImpactPct: number;
    referrerAmount: string;
    routePlan: SwapRoute[];
  };
}

export interface SwapExecuteParams {
  swapData: SwapComputeResponse['data'];
  wallet: string;
}

export interface SwapExecuteResponse {
  success: boolean;
  error?: string;
  data?: {
    signature: string;
    status: string;
  };
}

/**
 * Validates a mint address
 * @param mint The mint address to validate
 * @returns True if the mint address is valid, false otherwise
 */
export function isValidMintAddress(mint: string): boolean {
  try {
    new PublicKey(mint);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Converts SOL to lamports
 * @param sol The amount of SOL
 * @returns The equivalent amount in lamports
 */
export function solToLamports(sol: number): number {
  return Math.floor(sol * LAMPORTS_PER_SOL);
}

/**
 * Converts lamports to SOL
 * @param lamports The amount in lamports
 * @returns The equivalent amount in SOL
 */
export function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}

/**
 * Computes a swap using the Sega API
 * @param params The swap parameters
 * @returns A promise that resolves to the swap computation response
 */
export async function computeSwap(params: SwapComputeParams): Promise<SwapComputeResponse> {
  try {
    // Validate input parameters
    if (!isValidMintAddress(params.inputMint)) {
      return { success: false, error: 'Invalid input mint address' };
    }
    
    if (!isValidMintAddress(params.outputMint)) {
      return { success: false, error: 'Invalid output mint address' };
    }
    
    if (params.amount <= 0) {
      return { success: false, error: 'Amount must be greater than 0' };
    }
    
    if (params.slippageBps < 0 || params.slippageBps > 10000) {
      return { success: false, error: 'Slippage must be between 0 and 10000 basis points' };
    }
    
    // Construct the API URL
    const url = new URL('https://api.sega.so/swap/compute/swap-base-in');
    url.searchParams.append('inputMint', params.inputMint);
    url.searchParams.append('outputMint', params.outputMint);
    url.searchParams.append('amount', params.amount.toString());
    url.searchParams.append('slippageBps', params.slippageBps.toString());
    url.searchParams.append('txVersion', 'V0');
    
    // Make the API request
    console.log(`Computing swap: ${url.toString()}`);
    const response = await fetch(url.toString());
    const data = await response.json() as { 
      success: boolean; 
      error?: string;
      data?: any;
    };
    
    // Check for API errors
    if (!data.success) {
      return { 
        success: false, 
        error: data.error || 'Failed to compute swap' 
      };
    }
    
    // Return the successful response
    return {
      success: true,
      data: data.data
    };
  } catch (error) {
    console.error('Error computing swap:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred while computing swap' 
    };
  }
}

/**
 * Formats a swap computation response into a readable string
 * @param response The swap computation response
 * @returns A formatted string representation of the swap computation
 */
export function formatSwapComputation(response: SwapComputeResponse): string {
  if (!response.success || !response.data) {
    return `Error: ${response.error || 'Unknown error occurred'}`;
  }
  
  const data = response.data;
  
  // Define known token decimals
  const SONIC_MINT = 'mrujEYaN1oyQXDHeYNxBYpxWKVkQ2XsGxfznpifu4aL';
  const tokenDecimals: Record<string, number> = {
    [SOL_MINT]: 9,
    [SONIC_MINT]: 9,
    // Add other known tokens here
  };
  
  // Get token symbols
  const tokenSymbols: Record<string, string> = {
    [SOL_MINT]: 'SOL',
    [SONIC_MINT]: 'SONIC',
    // Add other known tokens here
  };
  
  // Format input amount with proper decimals
  let inputAmount: string;
  let inputSymbol = tokenSymbols[data.inputMint] || data.inputMint.slice(0, 4) + '...' + data.inputMint.slice(-4);
  
  if (data.inputMint === SOL_MINT) {
    const solAmount = lamportsToSol(Number(data.inputAmount));
    inputAmount = `${solAmount.toFixed(6)} ${inputSymbol}`;
  } else if (data.inputMint === SONIC_MINT) {
    // SONIC has 9 decimals
    const rawAmount = Number(data.inputAmount);
    const formattedAmount = (rawAmount / Math.pow(10, 9)).toFixed(6);
    inputAmount = `${formattedAmount} ${inputSymbol}`;
  } else {
    // For other tokens, check if we know the decimals
    const decimals = tokenDecimals[data.inputMint] || 0;
    if (decimals > 0) {
      const rawAmount = Number(data.inputAmount);
      const formattedAmount = (rawAmount / Math.pow(10, decimals)).toFixed(6);
      inputAmount = `${formattedAmount} ${inputSymbol}`;
    } else {
      // If we don't know the decimals, just show the raw amount
      inputAmount = `${data.inputAmount} ${inputSymbol}`;
    }
  }
  
  // Format output amount with proper decimals
  let outputAmount: string;
  let outputSymbol = tokenSymbols[data.outputMint] || data.outputMint.slice(0, 4) + '...' + data.outputMint.slice(-4);
  
  if (data.outputMint === SOL_MINT) {
    const solAmount = lamportsToSol(Number(data.outputAmount));
    outputAmount = `${solAmount.toFixed(6)} ${outputSymbol}`;
  } else if (data.outputMint === SONIC_MINT) {
    // SONIC has 9 decimals
    const rawAmount = Number(data.outputAmount);
    const formattedAmount = (rawAmount / Math.pow(10, 9)).toFixed(6);
    outputAmount = `${formattedAmount} ${outputSymbol}`;
  } else {
    // For other tokens, check if we know the decimals
    const decimals = tokenDecimals[data.outputMint] || 0;
    if (decimals > 0) {
      const rawAmount = Number(data.outputAmount);
      const formattedAmount = (rawAmount / Math.pow(10, decimals)).toFixed(6);
      outputAmount = `${formattedAmount} ${outputSymbol}`;
    } else {
      // If we don't know the decimals, just show the raw amount
      outputAmount = `${data.outputAmount} ${outputSymbol}`;
    }
  }
  
  // Format the swap details
  let result = `🔄 Swap Details\n\n`;
  result += `From: ${inputAmount}\n`;
  result += `To: ${outputAmount}\n`;
  result += `Price Impact: ${data.priceImpactPct.toFixed(2)}%\n`;
  result += `Slippage Tolerance: ${data.slippageBps / 100}%\n`;
  
  if (data.routePlan.length > 0) {
    const route = data.routePlan[0];
    
    // Format fee amount with proper decimals
    let feeAmount: string;
    if (data.inputMint === SOL_MINT) {
      const feeSol = lamportsToSol(Number(route.feeAmount));
      feeAmount = `${feeSol.toFixed(6)} ${inputSymbol}`;
    } else if (data.inputMint === SONIC_MINT) {
      // SONIC has 9 decimals
      const rawFee = Number(route.feeAmount);
      const formattedFee = (rawFee / Math.pow(10, 9)).toFixed(6);
      feeAmount = `${formattedFee} ${inputSymbol}`;
    } else {
      // For other tokens, check if we know the decimals
      const decimals = tokenDecimals[data.inputMint] || 0;
      if (decimals > 0) {
        const rawFee = Number(route.feeAmount);
        const formattedFee = (rawFee / Math.pow(10, decimals)).toFixed(6);
        feeAmount = `${formattedFee} ${inputSymbol}`;
      } else {
        // If we don't know the decimals, just show the raw amount
        feeAmount = `${route.feeAmount} ${inputSymbol}`;
      }
    }
    
    result += `Fee: ${feeAmount} (${route.feeRate / 100}%)\n`;
    result += `Pool: ${route.poolId.slice(0, 4)}...${route.poolId.slice(-4)}\n`;
  }
  
  return result;
}

/**
 * Checks if a wallet has sufficient balance for a swap
 * @param walletAddress The wallet address
 * @param inputMint The input token mint
 * @param amount The amount to swap
 * @returns A promise that resolves to a boolean indicating if the wallet has sufficient balance
 */
export async function hasWalletSufficientBalance(
  walletAddress: string,
  inputMint: string,
  amount: number
): Promise<{ sufficient: boolean; error?: string }> {
  try {
    // Validate wallet address
    if (!isValidSonicAddress(walletAddress)) {
      return { sufficient: false, error: 'Invalid wallet address' };
    }
    
    // For now, we only support SOL swaps
    if (inputMint === SOL_MINT) {
      try {
        // Get SOL balance
        const rpcUrl = 'https://rpc.mainnet-alpha.sonic.game/';
        console.log(`Checking wallet balance for ${walletAddress} at ${rpcUrl}`);
        
        const response = await fetch(rpcUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getBalance',
            params: [walletAddress],
          }),
          // Add timeout to prevent hanging
          signal: AbortSignal.timeout(5000),
        }).catch(err => {
          console.error('Network error when fetching balance:', err);
          throw new Error(`Network error: ${err.message || 'Failed to connect to RPC endpoint'}`);
        });
        
        if (!response.ok) {
          console.error('RPC response not OK:', response.status, response.statusText);
          return { 
            sufficient: false, 
            error: `RPC Error: ${response.status} ${response.statusText}` 
          };
        }
        
        const data = await response.json().catch(err => {
          console.error('Error parsing RPC response:', err);
          throw new Error('Failed to parse RPC response');
        }) as {
          error?: {
            message?: string;
          };
          result?: {
            value: number;
          };
        };
        
        // Check for RPC errors
        if (data.error) {
          console.error('RPC Error in getBalance:', data.error);
          return { 
            sufficient: false, 
            error: `RPC Error: ${data.error.message || JSON.stringify(data.error)}` 
          };
        }
        
        // Validate the response structure
        if (!data.result || data.result.value === undefined) {
          console.error('Invalid RPC response structure:', data);
          return { 
            sufficient: false, 
            error: 'Invalid RPC response: Missing balance data' 
          };
        }
        
        const solBalance = data.result.value;
        console.log(`Wallet balance: ${solBalance} lamports (${lamportsToSol(solBalance)} SOL)`);
        
        // Check if balance is sufficient (add some buffer for transaction fees)
        const requiredAmount = amount + 5000; // Add 5000 lamports for transaction fees
        
        if (solBalance < requiredAmount) {
          return { 
            sufficient: false, 
            error: `Insufficient SOL balance. Required: ${lamportsToSol(requiredAmount)} SOL, Available: ${lamportsToSol(solBalance)} SOL` 
          };
        }
        
        return { sufficient: true };
      } catch (rpcError) {
        console.error('Error in RPC call:', rpcError);
        return { 
          sufficient: false, 
          error: `Failed to check wallet balance: ${rpcError instanceof Error ? rpcError.message : 'Unknown RPC error'}` 
        };
      }
    } else {
      // For other tokens, we would need to implement token balance checking
      // This would involve calling getTokenAccountsByOwner RPC method
      return { 
        sufficient: false, 
        error: 'Token balance checking not implemented for non-SOL tokens yet' 
      };
    }
  } catch (error) {
    console.error('Error checking wallet balance:', error);
    return { 
      sufficient: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred while checking balance' 
    };
  }
}

/**
 * Executes a swap transaction
 * @param params The swap execution parameters
 * @returns A promise that resolves to the swap execution response
 */
export async function executeSwap(params: SwapExecuteParams): Promise<SwapExecuteResponse> {
  // This is a placeholder for the actual swap execution
  // In a real implementation, this would involve creating and signing a transaction
  return {
    success: false,
    error: 'Swap execution is not implemented yet'
  };
} 