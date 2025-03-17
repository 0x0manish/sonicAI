import { NextRequest, NextResponse } from 'next/server';
import { getLiquidityPools } from '@/lib/liquidity-pool-utils';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cache-Control, Pragma',
};

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET(request: NextRequest) {
  console.log('Liquidity pools API endpoint called');
  
  try {
    // Fetch liquidity pools directly from Sega API
    console.log('Fetching liquidity pools from Sega API');
    const poolsData = await getLiquidityPools();
    console.log('Pools data fetched:', poolsData.success, 'error:', poolsData.error || 'none');
    
    if (!poolsData.success || !poolsData.data) {
      console.error('Failed to fetch liquidity pools:', poolsData.error);
      
      // Return error response
      return NextResponse.json(
        { 
          success: false, 
          error: poolsData.error || 'Failed to fetch liquidity pools from Sega API'
        },
        { status: 500, headers: corsHeaders }
      );
    }
    
    // Log the data structure to help debug
    console.log('Pools data structure:', 
      'count:', poolsData.data.count, 
      'hasNextPage:', poolsData.data.hasNextPage,
      'pools count:', poolsData.data.data.length
    );
    
    // Ensure we have valid data to return
    if (!poolsData.data.data || !Array.isArray(poolsData.data.data) || poolsData.data.data.length === 0) {
      console.log('No pools found in API response');
      return NextResponse.json(
        { 
          success: false, 
          error: 'No liquidity pools found in API response'
        },
        { status: 404, headers: corsHeaders }
      );
    }
    
    // Return the pools data
    const response = NextResponse.json(
      { success: true, data: poolsData.data },
      { status: 200, headers: corsHeaders }
    );
    
    return response;
  } catch (error) {
    console.error('Error processing liquidity pools request:', error);
    
    // Return error response
    return NextResponse.json(
      { 
        success: false, 
        error: `Error fetching liquidity pools: ${error instanceof Error ? error.message : 'Unknown error'}`
      },
      { status: 500, headers: corsHeaders }
    );
  }
} 