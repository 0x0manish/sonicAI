import { NextRequest, NextResponse } from 'next/server';
import { getSonicStats } from '@/lib/stats-utils';

export const runtime = 'edge';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cache-Control, Pragma',
};

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

// Fallback data in case the API is down
const fallbackStats = {
  success: true,
  tvl: 9079.02, // Updated to match current API data
  volume24: 238, // Updated to match current API data
};

/**
 * Fetches stats directly from the Sega API
 * This is a direct implementation to ensure we get fresh data
 */
async function fetchDirectFromSegaAPI() {
  console.log('Fetching stats directly from Sega API');
  
  // Add a timestamp to prevent caching
  const timestamp = new Date().getTime();
  const url = `https://api.sega.so/api/main/info?_t=${timestamp}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'accept': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
  
  if (!response.ok) {
    throw new Error(`API returned status ${response.status}`);
  }
  
  const data = await response.json();
  
  if (!data.success || !data.data) {
    throw new Error('API returned unsuccessful data');
  }
  
  return {
    success: true,
    tvl: data.data.tvl,
    volume24: data.data.volume24
  };
}

/**
 * GET handler for the Sonic chain stats API endpoint
 * @param req The incoming request
 * @returns A JSON response with the Sonic chain stats
 */
export async function GET(req: NextRequest) {
  try {
    console.log('Stats API endpoint called');
    
    // Check if fallback is explicitly requested
    const searchParams = req.nextUrl.searchParams;
    const useFallback = searchParams.get('fallback') === 'true';
    
    if (useFallback) {
      console.log('Using fallback stats as explicitly requested');
      return NextResponse.json(fallbackStats, { 
        status: 200,
        headers: corsHeaders
      });
    }
    
    // Try to get real stats directly from external API
    try {
      // First try direct API call to ensure freshest data
      const directStats = await fetchDirectFromSegaAPI();
      console.log('Successfully fetched direct stats:', directStats);
      return NextResponse.json(directStats, { 
        status: 200,
        headers: corsHeaders
      });
    } catch (directApiError) {
      console.error('Error calling Sega API directly:', directApiError);
      
      // Fall back to using the utility function
      try {
        const stats = await getSonicStats();
        
        // If the API call succeeded, return the real data
        if (stats.success) {
          console.log('Successfully fetched real stats via utility:', stats);
          return NextResponse.json(stats, { 
            status: 200,
            headers: corsHeaders
          });
        }
        
        // If the API call failed, log the error and fall through to fallback
        console.log('External API returned unsuccessful data:', stats.error);
      } catch (apiError) {
        // If there was an exception calling the API, log it and fall through to fallback
        console.error('Error calling external API via utility:', apiError);
      }
    }
    
    // Only use fallback if explicitly requested or if all API calls failed
    console.log('All API calls failed, using fallback stats');
    return NextResponse.json(fallbackStats, { 
      status: 200,
      headers: corsHeaders
    });
  } catch (error) {
    console.error('Error in stats API:', error);
    
    // Return fallback data in case of error
    console.log('Error occurred, using fallback stats');
    return NextResponse.json(fallbackStats, { 
      status: 200,
      headers: corsHeaders
    });
  }
} 