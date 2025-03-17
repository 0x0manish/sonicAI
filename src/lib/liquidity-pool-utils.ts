import fetch from 'node-fetch';

/**
 * Interface for liquidity pool token information
 */
export interface PoolToken {
  chainId: number;
  address: string;
  programId: string;
  logoURI: string;
  symbol: string;
  name: string;
  decimals: number;
}

/**
 * Interface for liquidity pool time period metrics
 */
export interface PoolPeriodMetrics {
  volume: number;
  volumeQuote: number;
  volumeFee: number;
  apr: number;
  feeApr: number;
  priceMin: number;
  priceMax: number;
  rewardApr: any[];
}

/**
 * Interface for liquidity pool information
 */
export interface LiquidityPoolInfo {
  type: string;
  programId: string;
  id: string;
  mintA: PoolToken;
  mintB: PoolToken;
  price: number;
  mintAmountA: number;
  mintAmountB: number;
  feeRate: number;
  tvl: number;
  day: PoolPeriodMetrics;
  week: PoolPeriodMetrics;
  month: PoolPeriodMetrics;
  lpMint: PoolToken;
  lpPrice: number;
  lpAmount: number;
}

/**
 * Interface for liquidity pool API response
 */
export interface LiquidityPoolResponse {
  id: string;
  success: boolean;
  data: LiquidityPoolInfo[];
  error?: string;
}

/**
 * Interface for liquidity pool list API response
 */
export interface LiquidityPoolListResponse {
  id: string;
  success: boolean;
  data: {
    count: number;
    data: LiquidityPoolInfo[];
    hasNextPage: boolean;
  };
  error?: string;
}

/**
 * Fetches a liquidity pool by its ID
 * @param poolId The ID of the liquidity pool to fetch
 * @returns A promise that resolves to the liquidity pool information
 */
export async function getLiquidityPoolById(poolId: string): Promise<LiquidityPoolResponse> {
  try {
    console.log('Fetching liquidity pool data from Sega API for ID:', poolId);
    
    // Use the exact API endpoint with the pool ID
    const url = `https://api.sega.so/api/pools/info/ids?ids=${poolId}`;
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
      console.error(`Failed to fetch liquidity pool data: ${response.status} ${response.statusText}`);
      
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
        error: `Failed to fetch liquidity pool data: ${response.status} ${response.statusText}`
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
    
    const data = JSON.parse(responseText) as LiquidityPoolResponse;
    
    // Validate the response data
    if (!data || !data.data || !Array.isArray(data.data) || data.data.length === 0) {
      console.error('No pool data found for ID:', poolId);
      return {
        id: '',
        success: false,
        data: [],
        error: `No liquidity pool found with ID: ${poolId}`
      };
    }
    
    console.log('Successfully fetched pool data for ID:', poolId);
    return data;
  } catch (error) {
    console.error('Error fetching liquidity pool data:', error);
    return {
      id: '',
      success: false,
      data: [],
      error: `Failed to fetch liquidity pool data: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Formats liquidity pool information into a readable string with Markdown formatting
 * @param poolResponse The liquidity pool information
 * @returns A formatted string representation of the liquidity pool information
 */
export function formatLiquidityPoolInfo(poolResponse: LiquidityPoolResponse): string {
  if (!poolResponse.success || poolResponse.error) {
    return `Error: ${poolResponse.error || 'Failed to fetch liquidity pool data'}`;
  }

  if (!poolResponse.data || poolResponse.data.length === 0) {
    return 'No liquidity pool data found for the provided ID.';
  }

  // Use type assertion to handle both old and new API formats
  const pool = poolResponse.data[0] as any;
  
  try {
    // Check if the response is in the new format (with tokenPair)
    if (pool.hasOwnProperty('tokenPair')) {
      // New API format
      // Create a formatted message with pool information
      let message = `*${pool.tokenPair.baseSymbol}-${pool.tokenPair.quoteSymbol} Liquidity Pool*\n\n`;
      
      // Add token information
      message += `*Token Pair:* ${pool.tokenPair.baseSymbol}/${pool.tokenPair.quoteSymbol}\n`;
      message += `*Base Token:* ${pool.tokenPair.baseSymbol} (\`${pool.tokenPair.baseMint}\`)\n`;
      message += `*Quote Token:* ${pool.tokenPair.quoteSymbol} (\`${pool.tokenPair.quoteMint}\`)\n\n`;
      
      // Add liquidity information with consistent formatting
      message += `*Liquidity:*\n`;
      if (pool.liquidity) {
        // Format with 2 decimal places for consistency
        message += `- Total Value Locked: $${Number(pool.liquidity.tvl).toFixed(2)}\n`;
        // Format with appropriate decimal places for token amounts
        message += `- Base Reserve: ${Number(pool.liquidity.baseReserve).toFixed(4)} ${pool.tokenPair.baseSymbol}\n`;
        message += `- Quote Reserve: ${Number(pool.liquidity.quoteReserve).toFixed(4)} ${pool.tokenPair.quoteSymbol}\n\n`;
      } else {
        // Format with 2 decimal places for consistency
        message += `- Total Value Locked: $${Number(pool.tvl || 0).toFixed(2)}\n\n`;
      }
      
      // Add volume and fees with consistent formatting
      if (pool.volume) {
        message += `*Volume (24h):* $${Number(pool.volume.h24).toFixed(2)}\n`;
      } else if (pool.day) {
        message += `*Volume (24h):* $${Number(pool.day.volume).toFixed(2)}\n`;
      }
      
      if (pool.fees) {
        message += `*Fees:*\n`;
        message += `- LP Fee: ${(Number(pool.fees.lpFeeRate) * 100).toFixed(2)}%\n`;
        message += `- Platform Fee: ${(Number(pool.fees.platformFeeRate) * 100).toFixed(2)}%\n`;
        message += `- Total Fee: ${(Number(pool.fees.totalFeeRate) * 100).toFixed(2)}%\n\n`;
      } else if (pool.feeRate) {
        message += `*Fee Rate:* ${(Number(pool.feeRate) * 100).toFixed(2)}%\n\n`;
      }
      
      // Add APR if available with consistent formatting
      if (pool.apr) {
        message += `*APR:* ${(Number(pool.apr) * 100).toFixed(2)}%\n\n`;
      } else if (pool.day) {
        message += `*APR (24h):* ${(pool.day.apr * 100).toFixed(2)}%\n\n`;
      }
      
      // Add current price with consistent formatting
      if (pool.price) {
        message += `*Current Price:* 1 ${pool.tokenPair.baseSymbol} = ${Number(pool.price).toFixed(6)} ${pool.tokenPair.quoteSymbol}\n\n`;
      }
      
      // Add pool ID
      message += `*Pool ID:* \`${pool.id || pool.address}\`\n\n`;
      
      // Add link to Sega DEX
      message += `View on [Sega DEX](https://sega.so/liquidity-pools/ "Open in new tab")`;
      
      return message;
    } else {
      // Old API format
      // Format the pool information
      let result = `*${pool.mintA.symbol}-${pool.mintB.symbol} Liquidity Pool*\n\n`;
      
      // Add token information
      result += `*Token Pair:* ${pool.mintA.symbol} / ${pool.mintB.symbol}\n`;
      result += `*Token Addresses:*\n`;
      result += `- ${pool.mintA.symbol}: \`${pool.mintA.address}\`\n`;
      result += `- ${pool.mintB.symbol}: \`${pool.mintB.address}\`\n\n`;
      
      // Add pool metrics with consistent formatting
      result += `*Liquidity:* $${Number(pool.tvl).toFixed(2)}\n`;
      result += `*Volume (24h):* $${Number(pool.day.volume).toFixed(2)}\n`;
      result += `*Fees (24h):* $${Number(pool.day.volumeFee).toFixed(2)}\n`;
      result += `*APR (24h):* ${(pool.day.apr * 100).toFixed(2)}%\n\n`;
      
      // Add price information with consistent formatting
      result += `*Current Price:* 1 ${pool.mintA.symbol} = ${Number(pool.price).toFixed(6)} ${pool.mintB.symbol}\n`;
      result += `*Pool ID:* \`${pool.id}\`\n\n`;
      
      // Add link to Sega DEX
      result += `View on [Sega DEX](https://sega.so/liquidity-pools/ "Open in new tab")`;
      
      return result;
    }
  } catch (error) {
    console.error('Error formatting liquidity pool info:', error);
    
    // Fallback to a simple format
    try {
      let fallbackMessage = `*Liquidity Pool Information*\n\n`;
      fallbackMessage += `*Pool ID:* \`${pool.id}\`\n\n`;
      
      if (pool.mintA && pool.mintB) {
        fallbackMessage += `*Token Pair:* ${pool.mintA.symbol} / ${pool.mintB.symbol}\n`;
      } else if (pool.tokenPair) {
        fallbackMessage += `*Token Pair:* ${pool.tokenPair.baseSymbol} / ${pool.tokenPair.quoteSymbol}\n`;
      }
      
      fallbackMessage += `\nSome pool details could not be displayed due to a formatting error.`;
      return fallbackMessage;
    } catch (fallbackError) {
      return 'Error formatting liquidity pool information. Please try again later.';
    }
  }
}

/**
 * Validates if a string is a valid liquidity pool ID
 * @param id The string to validate
 * @returns True if the string is a valid liquidity pool ID, false otherwise
 */
export function isValidPoolId(id: string): boolean {
  // Sega pool IDs are base58 encoded strings, typically 32-44 characters long
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(id);
}

/**
 * Fetches a list of liquidity pools
 * @returns A promise that resolves to the liquidity pool list
 */
export async function getLiquidityPools(): Promise<LiquidityPoolListResponse> {
  try {
    console.log('Fetching liquidity pools from Sega API');
    
    // Use the exact API endpoint with page=1 and pageSize=6 as specified
    const url = 'https://api.sega.so/api/pools/info/list?page=1&pageSize=6';
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
    
    // Handle non-OK responses
    if (!response.ok) {
      console.error(`Failed to fetch liquidity pools: ${response.status} ${response.statusText}`);
      
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
        data: {
          count: 0,
          data: [],
          hasNextPage: false
        },
        error: `Failed to fetch liquidity pools: ${response.status} ${response.statusText}`
      };
    }

    // Try to parse the JSON response
    const responseText = await response.text();
    console.log('Response text preview:', responseText.substring(0, 200) + '...');
    
    // Check if the response is valid JSON
    if (!responseText.trim() || !responseText.trim().startsWith('{')) {
      console.error('Invalid JSON response:', responseText);
      return {
        id: '',
        success: false,
        data: {
          count: 0,
          data: [],
          hasNextPage: false
        },
        error: 'Invalid response format from API'
      };
    }
    
    const data = JSON.parse(responseText) as LiquidityPoolListResponse;
    
    console.log(`Received ${data.data?.data?.length || 0} pools out of ${data.data?.count || 0} total`);
    
    // Validate the response data
    if (!data || !data.data || !data.data.data || !Array.isArray(data.data.data)) {
      console.error('Invalid response data format:', data);
      return {
        id: '',
        success: false,
        data: {
          count: 0,
          data: [],
          hasNextPage: false
        },
        error: 'Invalid response data format from API'
      };
    }
    
    // Log each pool for debugging
    console.log('Pools received:');
    data.data.data.forEach((pool, index) => {
      console.log(`Pool ${index + 1}: ${pool.mintA?.symbol || 'Unknown'}-${pool.mintB?.symbol || 'Unknown'}, ID: ${pool.id || 'Unknown'}`);
    });
    
    return data;
  } catch (error) {
    console.error('Error fetching liquidity pools:', error);
    
    return {
      id: '',
      success: false,
      data: {
        count: 0,
        data: [],
        hasNextPage: false
      },
      error: `Failed to fetch liquidity pools: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Formats a list of liquidity pools into a readable string with Markdown formatting
 * @param poolsResponse The liquidity pool list response
 * @returns A formatted string representation of the liquidity pool list
 */
export function formatLiquidityPoolList(poolsResponse: any): string {
  console.log('Formatting liquidity pool list, response type:', typeof poolsResponse);
  
  // Handle string responses (error messages)
  if (typeof poolsResponse === 'string') {
    console.error('Received string response instead of JSON:', poolsResponse);
    return `Error: ${poolsResponse}`;
  }
  
  // Check if the response is successful
  if (!poolsResponse.success) {
    const errorMsg = `Error: ${poolsResponse.error || 'Failed to fetch liquidity pools'}`;
    console.error('Unsuccessful response:', errorMsg);
    return errorMsg;
  }

  // Check if data exists and has the expected structure
  if (!poolsResponse.data || !poolsResponse.data.data || !Array.isArray(poolsResponse.data.data) || poolsResponse.data.data.length === 0) {
    console.log('No pools found in response or invalid data structure');
    return 'No liquidity pools found or invalid data format.';
  }

  const poolsData = poolsResponse.data.data;
  console.log(`Formatting ${poolsData.length} pools out of ${poolsResponse.data.count} total`);
  
  try {
    let result = `## Available Liquidity Pools (${poolsResponse.data.count} total)\n\n`;
    
    // Process all pools in the response (up to 6)
    const poolsToShow = poolsData.length;
    
    for (let i = 0; i < poolsToShow; i++) {
      const pool = poolsData[i];
      
      // Safely check if mintA and mintB exist
      if (!pool.mintA || !pool.mintB) {
        console.error(`Pool at index ${i} is missing mintA or mintB:`, pool);
        continue;
      }
      
      // Format each pool
      result += `**${i + 1}. ${pool.mintA.symbol}/${pool.mintB.symbol}**\n`;
      
      // Add liquidity information with consistent formatting
      if (pool.tvl !== undefined) {
        // Format with 2 decimal places for consistency
        result += `- Liquidity: $${Number(pool.tvl).toFixed(2)}\n`;
      }
      
      // Add volume information with consistent formatting
      if (pool.day && pool.day.volume !== undefined) {
        // Format with 2 decimal places for consistency
        result += `- Volume (24h): $${Number(pool.day.volume).toFixed(2)}\n`;
      }
      
      // Add APR information with consistent formatting
      if (pool.day && pool.day.apr !== undefined) {
        result += `- APR (24h): ${(Number(pool.day.apr) * 100).toFixed(2)}%\n`;
      }
      
      // Add fee information
      if (pool.feeRate !== undefined) {
        const feePercentage = (Number(pool.feeRate) / 10000).toFixed(2);
        result += `- Fee Rate: ${feePercentage}%\n`;
      }
      
      // Add pool ID
      result += `- Pool ID: \`${pool.id}\`\n\n`;
    }
    
    // Add link to view all pools on Sega DEX
    result += `View all liquidity pools on [Sega DEX](https://sega.so/liquidity-pools/ "Open in new tab")\n`;
    
    console.log('Formatted response length:', result.length);
    return result;
  } catch (error) {
    console.error('Error formatting liquidity pool list:', error);
    
    // We should never reach this point if we're using real data correctly
    return `Error formatting liquidity pool list: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again later.`;
  }
} 