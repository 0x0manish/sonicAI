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
 * Interface for token details response from the Sega API
 */
export interface TokenDetailsResponse {
  id: string;
  success: boolean;
  data: TokenDetails[];
  error?: string;
}

/**
 * Interface for token details
 */
export interface TokenDetails {
  chainId: number;
  address: string;
  programId: string;
  logoURI: string;
  symbol: string;
  name: string;
  decimals: number;
  tags: string[];
  extensions: Record<string, any>;
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
      // Format price with 4 decimal places for consistency
      result = `The current price of token ${mint.slice(0, 6)}...${mint.slice(-4)} is $${price.toFixed(4)}.`;
    } else {
      result = `I couldn't find price information for the token with mint address ${mint.slice(0, 6)}...${mint.slice(-4)}. Please verify that this is a valid token mint address on Sonic.`;
    }
  } else {
    result = 'Current Token Prices:\n\n';
    
    for (const mint of mints) {
      const price = response.prices[mint];
      
      if (price !== undefined) {
        // Format price with 4 decimal places for consistency
        result += `- ${mint.slice(0, 6)}...${mint.slice(-4)}: $${price.toFixed(4)}\n`;
      } else {
        result += `- ${mint.slice(0, 6)}...${mint.slice(-4)}: Price not available\n`;
      }
    }
  }
  
  return result;
}

/**
 * Fetches token details by mint address
 * @param mintAddress The mint address of the token
 * @returns A promise that resolves to the token details
 */
export async function getTokenDetails(mintAddress: string): Promise<TokenDetailsResponse> {
  try {
    console.log('Fetching token details from Sega API for mint:', mintAddress);
    
    // Use the exact API endpoint with the mint address
    const url = `https://api.sega.so/api/mint/ids?mints=${mintAddress}`;
    console.log('API URL:', url);
    
    // Add a timestamp to prevent caching
    const timestamp = new Date().getTime();
    const urlWithTimestamp = `${url}&_t=${timestamp}`;
    console.log('API URL with timestamp:', urlWithTimestamp);
    
    // Make the request with additional headers
    const response = await fetch(urlWithTimestamp, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'Origin': 'https://sega.so',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'User-Agent': 'Mozilla/5.0 (compatible; SonicAgent/1.0)'
      }
    });

    console.log('API response status:', response.status);

    if (!response.ok) {
      console.error(`Failed to fetch token details: ${response.status} ${response.statusText}`);
      
      // Try to get the response text for more information
      try {
        const responseText = await response.text();
        console.error('Response text:', responseText);
      } catch (textError) {
        console.error('Could not get response text:', textError);
      }
      
      return {
        id: '',
        success: false,
        data: [],
        error: `Failed to fetch token details: ${response.status} ${response.statusText}`
      };
    }

    // Get the response as text first
    const responseText = await response.text();
    console.log('Response text preview:', responseText.substring(0, 200) + '...');
    
    // Check if the response is valid JSON
    if (!responseText.trim() || !responseText.trim().startsWith('{')) {
      console.error('Invalid JSON response:', responseText);
      return {
        id: '',
        success: false,
        data: [],
        error: 'Invalid response format from API'
      };
    }
    
    const data = JSON.parse(responseText) as TokenDetailsResponse;
    
    // Validate the response data
    if (!data || !data.data || !Array.isArray(data.data) || data.data.length === 0) {
      console.error('No token details found for mint:', mintAddress);
      return {
        id: '',
        success: false,
        data: [],
        error: `No token details found for mint address: ${mintAddress}`
      };
    }
    
    console.log('Successfully fetched token details for mint:', mintAddress);
    return data;
  } catch (error) {
    console.error('Error fetching token details:', error);
    return {
      id: '',
      success: false,
      data: [],
      error: `Failed to fetch token details: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Formats token details into a readable string with Markdown formatting
 * @param tokenResponse The token details response
 * @returns A formatted string representation of the token details
 */
export function formatTokenDetails(tokenResponse: TokenDetailsResponse): string {
  if (!tokenResponse.success || tokenResponse.error) {
    return `Error: ${tokenResponse.error || 'Failed to fetch token details'}`;
  }

  if (!tokenResponse.data || tokenResponse.data.length === 0) {
    return 'No token details found for the provided mint address.';
  }

  const token = tokenResponse.data[0];
  
  try {
    // Create a formatted message with token information
    let message = `## ${token.name} (${token.symbol}) Token Details\n\n`;
    
    // Add token information
    message += `**Symbol:** ${token.symbol}\n`;
    message += `**Name:** ${token.name}\n`;
    message += `**Decimals:** ${token.decimals}\n\n`;
    
    // Add addresses
    message += `**Mint Address:** \`${token.address}\`\n`;
    message += `**Program ID:** \`${token.programId}\`\n\n`;
    
    // Add chain information
    message += `**Chain ID:** ${token.chainId}\n\n`;
    
    // Add logo if available
    if (token.logoURI) {
      message += `**Logo:** [View Logo](${token.logoURI})\n\n`;
    }
    
    // Add tags if available
    if (token.tags && token.tags.length > 0) {
      message += `**Tags:** ${token.tags.join(', ')}\n\n`;
    }
    
    // Add link to view on Sega DEX
    message += `You can view this token on [Sega DEX](https://sega.so/token/${token.address} "Open in new tab")`;
    
    return message;
  } catch (error) {
    console.error('Error formatting token details:', error);
    return `Error formatting token details: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again later.`;
  }
} 