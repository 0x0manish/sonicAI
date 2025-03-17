import { NextRequest, NextResponse } from 'next/server';

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
      'Origin': 'https://sega.so',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'User-Agent': 'Mozilla/5.0 (compatible; SonicAgent/1.0)'
    }
  });
  
  if (!response.ok) {
    console.error(`API returned status ${response.status}`);
    
    // Try to get the response text for more information
    try {
      const responseText = await response.text();
      console.error('Response text:', responseText);
    } catch (textError) {
      console.error('Could not get response text:', textError);
    }
    
    throw new Error(`API returned status ${response.status}`);
  }
  
  // Get the response as text first
  const responseText = await response.text();
  console.log('Response text preview:', responseText.substring(0, 200) + '...');
  
  // Check if the response is valid JSON
  if (!responseText.trim() || !responseText.trim().startsWith('{')) {
    console.error('Invalid JSON response:', responseText);
    throw new Error('Invalid response format from API');
  }
  
  const data = JSON.parse(responseText);
  
  if (!data.success || !data.data) {
    console.error('API returned unsuccessful data:', data);
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
    
    // Try to get real stats directly from external API
    try {
      const directStats = await fetchDirectFromSegaAPI();
      console.log('Successfully fetched direct stats:', directStats);
      return NextResponse.json(directStats, { 
        status: 200,
        headers: corsHeaders
      });
    } catch (directApiError) {
      console.error('Error calling Sega API directly:', directApiError);
      
      // Return error response
      return NextResponse.json({
        success: false,
        error: `Failed to fetch stats from Sega API: ${directApiError instanceof Error ? directApiError.message : 'Unknown error'}`
      }, { 
        status: 500,
        headers: corsHeaders
      });
    }
  } catch (error) {
    console.error('Error in stats API:', error);
    
    // Return error response
    return NextResponse.json({
      success: false,
      error: `Error fetching stats: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { 
      status: 500,
      headers: corsHeaders
    });
  }
} 