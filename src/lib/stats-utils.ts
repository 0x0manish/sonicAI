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
  try {
    // Call the Sega API
    const response = await fetch('https://api.sega.so/api/main/info', {
      method: 'GET',
      headers: {
        'accept': 'application/json',
      },
    });

    // Parse the response
    const data = await response.json() as SonicStatsApiResponse;
    
    // Check for API success
    if (!data.success || !data.data) {
      return {
        success: false,
        tvl: 0,
        volume24: 0,
        error: 'Failed to fetch Sonic chain stats from the API'
      };
    }

    // Return the stats
    return {
      success: true,
      tvl: data.data.tvl,
      volume24: data.data.volume24
    };
  } catch (error) {
    console.error('Error fetching Sonic chain stats:', error);
    return {
      success: false,
      tvl: 0,
      volume24: 0,
      error: 'Failed to fetch Sonic chain stats. The service might be temporarily unavailable.'
    };
  }
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