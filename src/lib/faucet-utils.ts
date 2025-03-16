import { isValidSonicAddress } from './wallet-utils';

/**
 * Interface for faucet API response
 */
interface FaucetApiResponse {
  id: string;
  success: boolean;
  message?: string;
  data?: {
    wallet: string;
  };
}

/**
 * Interface for faucet response
 */
export interface FaucetResponse {
  success: boolean;
  message?: string;
  data?: {
    wallet: string;
  };
  error?: string;
}

/**
 * Requests tokens from the Sega faucet for a given wallet address
 * @param address The wallet address to send tokens to
 * @returns A promise that resolves to the faucet response
 */
export async function requestFaucetTokens(address: string): Promise<FaucetResponse> {
  try {
    // Validate the address first
    if (!isValidSonicAddress(address)) {
      return {
        success: false,
        error: 'Invalid wallet address'
      };
    }

    // Call the Sega faucet API
    const response = await fetch('https://api.sega.so/sega/faucet', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        wallet: address
      }),
    });

    // Parse the response
    const data = await response.json() as FaucetApiResponse;
    
    // Handle API errors
    if (!response.ok) {
      // Check for the 24-hour limit error
      if (data.message && data.message.includes("once every 24 hours")) {
        return {
          success: false,
          message: `Looks like this wallet has already received tokens today. The faucet allows only one request per wallet every 24 hours. Please try again tomorrow!`
        };
      }
      
      return {
        success: false,
        message: data.message || `Error: ${response.status} ${response.statusText}`
      };
    }

    // Return the successful response
    return {
      success: true,
      data: data.data,
      message: data.message || 'Tokens successfully sent to your wallet!'
    };
  } catch (error) {
    console.error('Error requesting faucet tokens:', error);
    return {
      success: false,
      error: 'Failed to request tokens from the faucet. Please try again later.'
    };
  }
}

/**
 * Formats a faucet response into a readable string
 * @param response The faucet response
 * @returns A formatted string representation of the faucet response
 */
export function formatFaucetResponse(response: FaucetResponse): string {
  if (!response.success) {
    return `${response.message || response.error || 'Unknown error occurred'}`;
  }

  return `Success! Tokens have been sent to your wallet: ${response.data?.wallet.slice(0, 6)}...${response.data?.wallet.slice(-4)}`;
} 