/**
 * Interface for Sonic chain stats API response
 */
interface SonicStatsApiResponse {
  id: string;
  success: boolean;
  data: {
    tvl: number;
    volume24: number;
  };
}

/**
 * Interface for Sonic chain stats
 */
export interface SonicStats {
  success: boolean;
  tvl: number;
  volume24: number;
  error?: string;
}

/**
 * Fetches the TVL and 24-hour volume stats for Sonic chain
 * @returns A promise that resolves to the Sonic chain stats
 */
export async function getSonicStats(): Promise<SonicStats> {
  const maxRetries = 2;
  let retryCount = 0;
  
  while (retryCount <= maxRetries) {
    try {
      console.log(`Fetching Sonic chain stats (attempt ${retryCount + 1}/${maxRetries + 1})...`);
      
      // Add a timestamp to prevent caching
      const timestamp = new Date().getTime();
      const url = `https://api.sega.so/api/main/info?_t=${timestamp}`;
      
      // Create an AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      // Call the Sega API with timeout
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        signal: controller.signal
      });
      
      // Clear the timeout
      clearTimeout(timeoutId);
      
      // Check if response is OK
      if (!response.ok) {
        console.error(`API returned status ${response.status}`);
        throw new Error(`API returned status ${response.status}`);
      }

      // Parse the response
      const responseText = await response.text();
      console.log('API response text:', responseText.substring(0, 100) + '...');
      
      // Check if response is valid JSON
      if (!responseText.trim() || !responseText.trim().startsWith('{')) {
        console.error('Invalid JSON response');
        throw new Error('Invalid JSON response');
      }
      
      const data = JSON.parse(responseText) as SonicStatsApiResponse;
      
      // Check for API success
      if (!data.success || !data.data) {
        console.error('API returned unsuccessful data');
        return {
          success: false,
          tvl: 0,
          volume24: 0,
          error: 'Failed to fetch Sonic chain stats from the API'
        };
      }
      
      // Validate the data
      if (typeof data.data.tvl !== 'number' || typeof data.data.volume24 !== 'number') {
        console.error('API returned invalid data format');
        return {
          success: false,
          tvl: 0,
          volume24: 0,
          error: 'API returned invalid data format'
        };
      }

      // Return the stats
      console.log('Successfully fetched stats:', data.data);
      return {
        success: true,
        tvl: data.data.tvl,
        volume24: data.data.volume24
      };
    } catch (error) {
      console.error(`Error fetching Sonic chain stats (attempt ${retryCount + 1}):`, error);
      
      // If we've reached max retries, return error
      if (retryCount >= maxRetries) {
        return {
          success: false,
          tvl: 0,
          volume24: 0,
          error: 'Failed to fetch Sonic chain stats after multiple attempts. The service might be temporarily unavailable.'
        };
      }
      
      // Otherwise, wait and retry
      retryCount++;
      await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
    }
  }
  
  // This should never be reached due to the return in the catch block
  return {
    success: false,
    tvl: 0,
    volume24: 0,
    error: 'Failed to fetch Sonic chain stats. The service might be temporarily unavailable.'
  };
}

/**
 * Formats Sonic chain stats into a readable string
 * @param stats The Sonic chain stats
 * @returns A formatted string representation of the Sonic chain stats
 */
export function formatSonicStats(stats: SonicStats): string {
  if (!stats.success) {
    return `Sorry, I couldn't fetch the latest Sonic chain stats. ${stats.error || 'Please try again later.'}`;
  }

  return `Sonic Chain Stats:\n\nTotal Value Locked (TVL): $${stats.tvl.toLocaleString()}\n24-hour Volume: $${stats.volume24.toLocaleString()}`;
} 