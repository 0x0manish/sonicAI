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
  // Updated regex to include 'L' which is part of the base58 alphabet
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  
  // Log the validation result for debugging
  const isValid = base58Regex.test(mint);
  console.log(`Validating token mint: ${mint}, isValid: ${isValid}`);
  
  return isValid;
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

    // Process each mint address individually using the new API endpoint
    const prices: Record<string, number> = {};
    let hasError = false;
    let errorMessage = '';

    // Define the expected API response type
    interface SegaTokenPriceResponse {
      success: boolean;
      data?: {
        priceInUSD: number;
      };
      error?: string;
    }

    // Use Promise.all to fetch prices for all mints in parallel
    await Promise.all(validMints.map(async (mint) => {
      try {
        console.log(`Fetching price for mint: ${mint}`);
        // Call the Sega API with the new endpoint
        const response = await fetch(`https://api.sega.so/sega/price?mint=${mint}`, {
          method: 'GET',
          headers: {
            'accept': 'application/json',
          },
        });

        if (!response.ok) {
          console.error(`Failed to fetch price for mint ${mint}: ${response.status} ${response.statusText}`);
          return;
        }

        // Parse the response
        const data = await response.json() as SegaTokenPriceResponse;
        
        // Check for API success
        if (data.success && data.data && data.data.priceInUSD !== undefined) {
          prices[mint] = data.data.priceInUSD;
          console.log(`Price for mint ${mint}: $${data.data.priceInUSD}`);
        } else {
          console.error(`No price data found for mint ${mint}`);
        }
      } catch (error) {
        console.error(`Error fetching price for mint ${mint}:`, error);
        hasError = true;
        errorMessage = 'Failed to fetch some token prices. The service might be temporarily unavailable.';
      }
    }));

    // Check if we have any price data
    if (Object.keys(prices).length > 0) {
      return {
        success: true,
        prices
      };
    } else {
      // No price data found
      return {
        success: false,
        prices: {},
        error: hasError ? errorMessage : 'No price data found for the provided token mint addresses'
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
 * @param priceResponse The token price API response
 * @param mintAddresses The mint addresses that were queried
 * @returns A formatted string with token price information
 */
export function formatTokenPrices(priceResponse: TokenPriceResponse, mintAddresses: string[]): string {
  console.log('Formatting token prices:', priceResponse, 'for mints:', mintAddresses);
  
  if (!priceResponse.success) {
    return `I couldn't fetch the token prices. ${priceResponse.error || 'The service might be temporarily unavailable.'}`;
  }
  
  // Check if we have price data
  if (!priceResponse.prices || Object.keys(priceResponse.prices).length === 0) {
    return `I couldn't find price information for the requested token(s).`;
  }
  
  // Special handling for SONIC token
  const SONIC_MINT = 'mrujEYaN1oyQXDHeYNxBYpxWKVkQ2XsGxfznpifu4aL';
  
  // Format the response based on the number of tokens
  if (mintAddresses.length === 1) {
    const mintAddress = mintAddresses[0];
    const price = priceResponse.prices[mintAddress];
    
    if (!price) {
      return `I couldn't find price information for this token.`;
    }
    
    // Special handling for SONIC token
    if (mintAddress === SONIC_MINT) {
      return `The current price of SONIC is $${Number(price).toFixed(4)} USD.`;
    }
    
    // For other tokens, use a generic format
    return `The current price of this token is $${Number(price).toFixed(4)} USD.`;
  } else {
    // Multiple tokens
    let response = '';
    let foundAny = false;
    
    mintAddresses.forEach(mintAddress => {
      const price = priceResponse.prices[mintAddress];
      if (price) {
        foundAny = true;
        
        // Special handling for SONIC token
        if (mintAddress === SONIC_MINT) {
          response += `SONIC: $${Number(price).toFixed(4)} USD\n`;
        } else {
          // For other tokens, use the shortened mint address
          response += `${mintAddress.slice(0, 4)}...${mintAddress.slice(-4)}: $${Number(price).toFixed(4)} USD\n`;
        }
      }
    });
    
    if (!foundAny) {
      return `I couldn't find price information for any of the requested tokens.`;
    }
    
    return response;
  }
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
    console.log('Sending request to Sega API...');
    
    // Create an AbortController for the timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    try {
      const response = await fetch(urlWithTimestamp, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'Origin': 'https://sega.so',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'User-Agent': 'Mozilla/5.0 (compatible; SonicAgent/1.0)'
        },
        signal: controller.signal
      });
      
      // Clear the timeout
      clearTimeout(timeoutId);

      console.log('API response status:', response.status);
      console.log('API response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        console.error(`Failed to fetch token details: ${response.status} ${response.statusText}`);
        
        // Try to get the response text for more information
        try {
          const responseText = await response.text();
          console.error('Error response text:', responseText);
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
      console.log('Full response text length:', responseText.length);
      
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
      
      try {
        const data = JSON.parse(responseText) as TokenDetailsResponse;
        console.log('Parsed token data:', JSON.stringify(data, null, 2));
        
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
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError);
        return {
          id: '',
          success: false,
          data: [],
          error: `Failed to parse token details: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
        };
      }
    } catch (fetchError) {
      // Clear the timeout if there was an error
      clearTimeout(timeoutId);
      
      // Check if this was an abort error (timeout)
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('Request timed out when fetching token details');
        return {
          id: '',
          success: false,
          data: [],
          error: 'Request timed out when fetching token details. Please try again later.'
        };
      }
      
      console.error('Fetch error when getting token details:', fetchError);
      return {
        id: '',
        success: false,
        data: [],
        error: `Network error: ${fetchError instanceof Error ? fetchError.message : 'Unknown fetch error'}`
      };
    }
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
    // Create a formatted message with token information using a more structured layout
    let message = `## ${token.name} (${token.symbol}) Token Details\n\n`;
    
    // Create a visually balanced layout with consistent formatting
    // Using a table-like structure for better alignment
    message += `| Property     | Value                                              |\n`;
    message += `| ------------ | -------------------------------------------------- |\n`;
    message += `| **Symbol**   | ${token.symbol}                                    |\n`;
    message += `| **Name**     | ${token.name}                                      |\n`;
    message += `| **Decimals** | ${token.decimals}                                  |\n`;
    message += `| **Chain ID** | ${token.chainId}                                   |\n`;
    message += `| **Mint**     | ${token.address}                                   |\n`;
    message += `| **Program**  | ${token.programId}                                 |\n`;
    
    // Add tags if available
    if (token.tags && token.tags.length > 0) {
      message += `\n**Tags:** ${token.tags.join(', ')}`;
    }
    
    return message;
  } catch (error) {
    console.error('Error formatting token details:', error);
    return `Error formatting token details: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again later.`;
  }
} 