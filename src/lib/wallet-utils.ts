import { PublicKey } from '@solana/web3.js';

/**
 * Interface for token balance information
 */
export interface TokenBalance {
  mint: string;
  symbol: string;
  amount: number;
  decimals: number;
  uiAmount: number;
  logo?: string;
}

/**
 * Interface for wallet balance information
 */
export interface WalletBalance {
  sol: number;
  tokens: TokenBalance[];
  error?: string;
}

/**
 * Interface for RPC response
 */
interface RPCResponse<T> {
  jsonrpc: string;
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
  };
}

/**
 * Interface for SOL balance result
 */
interface SolBalanceResult {
  value: number;
}

/**
 * Interface for token account data
 */
interface TokenAccountData {
  account: {
    data: {
      parsed: {
        info: {
          mint: string;
          tokenAmount: {
            amount: string;
            decimals: number;
            uiAmount: number;
          };
        };
      };
    };
  };
}

/**
 * Validates if a string is a valid Solana wallet address
 * @param address The wallet address to validate
 * @returns True if the address is valid, false otherwise
 */
export function isValidSonicAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Fetches the balance of a Sonic wallet using the specified RPC endpoint
 * @param address The wallet address to check
 * @param rpcUrl The RPC endpoint URL to use
 * @returns A promise that resolves to the wallet balance information
 */
async function fetchWalletBalance(address: string, rpcUrl: string): Promise<WalletBalance> {
  try {
    // Get SOL balance
    const solBalanceResponse = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: [address],
      }),
    });

    const solBalanceData = await solBalanceResponse.json() as RPCResponse<SolBalanceResult>;
    
    // Check for RPC errors
    if (solBalanceData.error) {
      console.error('RPC Error in getBalance:', solBalanceData.error);
      return {
        sol: 0,
        tokens: [],
        error: `RPC Error: ${solBalanceData.error.message}`
      };
    }
    
    const solBalance = (solBalanceData.result && solBalanceData.result.value !== undefined) 
      ? solBalanceData.result.value / 1_000_000_000 
      : 0; // Convert lamports to SOL

    try {
      // Get token accounts
      const tokenAccountsResponse = await fetch(rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getTokenAccountsByOwner',
          params: [
            address,
            {
              programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // Token program ID
            },
            {
              encoding: 'jsonParsed',
            },
          ],
        }),
      });

      const tokenAccountsData = await tokenAccountsResponse.json() as RPCResponse<{ value: TokenAccountData[] }>;
      
      // Check for RPC errors
      if (tokenAccountsData.error) {
        console.error('RPC Error in getTokenAccountsByOwner:', tokenAccountsData.error);
        // If there's an error with token accounts, still return the SOL balance
        return {
          sol: solBalance,
          tokens: [],
        };
      }
      
      const tokenAccounts = tokenAccountsData.result?.value || [];

      // Process token accounts to get balances
      const tokens: TokenBalance[] = [];
      for (const account of tokenAccounts) {
        try {
          const parsedInfo = account.account.data.parsed.info;
          const tokenBalance = parsedInfo.tokenAmount;
          
          if (tokenBalance.uiAmount > 0) {
            // Get token metadata (optional, can be expanded)
            const tokenInfo = {
              mint: parsedInfo.mint,
              symbol: '', // We would need to fetch this from a token list or metadata service
              amount: Number(tokenBalance.amount),
              decimals: tokenBalance.decimals,
              uiAmount: tokenBalance.uiAmount,
            };
            
            tokens.push(tokenInfo);
          }
        } catch (tokenError) {
          console.error('Error processing token account:', tokenError);
          // Continue with other token accounts
        }
      }

      return {
        sol: solBalance,
        tokens,
      };
    } catch (tokenError) {
      console.error('Error fetching token accounts:', tokenError);
      // Return just the SOL balance if token fetching fails
      return {
        sol: solBalance,
        tokens: [],
      };
    }
  } catch (error) {
    console.error('Error in fetchWalletBalance:', error);
    return {
      sol: 0,
      tokens: [],
      error: 'Failed to fetch wallet balance'
    };
  }
}

/**
 * Fetches the balance of a Sonic wallet
 * @param address The wallet address to check
 * @returns A promise that resolves to the wallet balance information
 */
export async function getSonicWalletBalance(address: string): Promise<WalletBalance> {
  try {
    // Validate the address first
    if (!isValidSonicAddress(address)) {
      return {
        sol: 0,
        tokens: [],
        error: 'Invalid wallet address'
      };
    }

    // Primary RPC endpoint
    const primaryRpcUrl = 'https://rpc.mainnet-alpha.sonic.game/';
    // Fallback RPC endpoint (Helius)
    const fallbackRpcUrl = 'https://sonic.helius-rpc.com/';

    try {
      // Try primary RPC endpoint first
      return await fetchWalletBalance(address, primaryRpcUrl);
    } catch (primaryError) {
      console.error('Error fetching wallet balance from primary RPC:', primaryError);
      
      // Try fallback RPC endpoint
      try {
        return await fetchWalletBalance(address, fallbackRpcUrl);
      } catch (fallbackError) {
        console.error('Error fetching wallet balance from fallback RPC:', fallbackError);
        return {
          sol: 0,
          tokens: [],
          error: 'Failed to fetch wallet balance from both primary and fallback RPC endpoints'
        };
      }
    }
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    return {
      sol: 0,
      tokens: [],
      error: 'Failed to fetch wallet balance'
    };
  }
}

/**
 * Formats wallet balance information into a readable string
 * @param balance The wallet balance information
 * @returns A formatted string representation of the wallet balance
 */
export function formatWalletBalance(balance: WalletBalance): string {
  if (balance.error) {
    return `Error: ${balance.error}`;
  }

  let result = `SOL Balance: ${balance.sol.toFixed(4)} SOL\n`;
  
  if (balance.tokens.length > 0) {
    result += '\nToken Balances:\n';
    balance.tokens.forEach((token) => {
      const symbol = token.symbol || 'Unknown Token';
      result += `- ${symbol}: ${token.uiAmount.toFixed(4)} (${token.mint.slice(0, 4)}...${token.mint.slice(-4)})\n`;
    });
  } else {
    result += '\nNo token balances found.';
  }
  
  return result;
} 