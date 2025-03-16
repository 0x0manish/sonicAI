/**
 * Interface for token price API response
 */
interface TokenPriceApiResponse {
  id: string;
  success: boolean;
  data: Record<string, string>;
}

/**
 * Interface for token price response
 */
export interface TokenPriceResponse {
  success: boolean;
  prices: Record<string, number>;
  error?: string;
}

/**
 * Validates if a string is a valid token mint address
 * Simple validation to check if it's a base58 string of the right length
 * @param mint The token mint address to validate
 * @returns True if the mint address format is valid, false otherwise
 */
export function isValidTokenMint(mint: string): boolean {
  // Basic validation - check if it's a base58 string of the right length
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(mint);
}

/**
 * Fetches the price of one or more tokens by their mint addresses
 * @param mints Array of token mint addresses
 * @returns A promise that resolves to the token price information
 */
export async function getTokenPrices(mints: string[]): Promise<TokenPriceResponse> {
  try {
    // Validate input
    if (!mints || mints.length === 0) {
      return {
        success: false,
        prices: {},
        error: 'No token mint addresses provided'
      };
    }

    // Filter out invalid mint addresses
    const validMints = mints.filter(mint => isValidTokenMint(mint));
    
    if (validMints.length === 0) {
      return {
        success: false,
        prices: {},
        error: 'No valid token mint addresses provided'
      };
    }

    // Build the query string
    const mintsParam = validMints.join(',');
    
    // Call the Sega API
    const response = await fetch(`https://api.sega.so/api/mint/price?mints=${mintsParam}`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
      },
    });

    // Parse the response
    const data = await response.json() as TokenPriceApiResponse;
    
    // Check for API success
    if (!data.success) {
      return {
        success: false,
        prices: {},
        error: 'Failed to fetch token prices from the API'
      };
    }

    // Process the price data
    const prices: Record<string, number> = {};
    
    // Check if we have any price data
    if (data.data && Object.keys(data.data).length > 0) {
      // Convert string prices to numbers
      for (const [mint, priceStr] of Object.entries(data.data)) {
        prices[mint] = parseFloat(priceStr);
      }
      
      return {
        success: true,
        prices
      };
    } else {
      // No price data found
      return {
        success: false,
        prices: {},
        error: 'No price data found for the provided token mint addresses'
      };
    }
  } catch (error) {
    console.error('Error fetching token prices:', error);
    return {
      success: false,
      prices: {},
      error: 'Failed to fetch token prices. The service might be temporarily unavailable.'
    };
  }
}

/**
 * Formats token price information into a readable string
 * @param response The token price response
 * @param mints The original mint addresses that were queried
 * @returns A formatted string representation of the token prices
 */
export function formatTokenPrices(response: TokenPriceResponse, mints: string[]): string {
  if (!response.success || Object.keys(response.prices).length === 0) {
    if (mints.length === 1) {
      return `I couldn't find price information for the token with mint address ${mints[0].slice(0, 6)}...${mints[0].slice(-4)}. Please verify that this is a valid token mint address on Sonic.`;
    } else {
      return `I couldn't find price information for the token mint addresses you provided. Please verify that these are valid token mint addresses on Sonic.`;
    }
  }

  let result = '';
  
  if (mints.length === 1) {
    const mint = mints[0];
    const price = response.prices[mint];
    
    if (price !== undefined) {
      result = `The current price of token ${mint.slice(0, 6)}...${mint.slice(-4)} is $${price.toFixed(4)}.`;
    } else {
      result = `I couldn't find price information for the token with mint address ${mint.slice(0, 6)}...${mint.slice(-4)}. Please verify that this is a valid token mint address on Sonic.`;
    }
  } else {
    result = 'Current Token Prices:\n\n';
    
    for (const mint of mints) {
      const price = response.prices[mint];
      
      if (price !== undefined) {
        result += `- ${mint.slice(0, 6)}...${mint.slice(-4)}: $${price.toFixed(4)}\n`;
      } else {
        result += `- ${mint.slice(0, 6)}...${mint.slice(-4)}: Price not available\n`;
      }
    }
  }
  
  return result;
} 