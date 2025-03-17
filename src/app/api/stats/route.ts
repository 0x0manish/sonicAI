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
  tvl: 25000000, // $25M TVL
  volume24: 5000000, // $5M 24h volume
};

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
    
    // Try to get real stats from external API
    console.log('Fetching stats from external API');
    try {
      const stats = await getSonicStats();
      
      // If the API call succeeded, return the real data
      if (stats.success) {
        console.log('Successfully fetched real stats:', stats);
        return NextResponse.json(stats, { 
          status: 200,
          headers: corsHeaders
        });
      }
      
      // If the API call failed, log the error and fall through to fallback
      console.log('External API returned unsuccessful data:', stats.error);
    } catch (apiError) {
      // If there was an exception calling the API, log it and fall through to fallback
      console.error('Error calling external API:', apiError);
    }
    
    // Only use fallback if explicitly requested or if the real API failed
    console.log('External API failed, using fallback stats');
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