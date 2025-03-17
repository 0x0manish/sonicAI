import { NextRequest, NextResponse } from 'next/server';
import { getLiquidityPoolById, isValidPoolId } from '@/lib/liquidity-pool-utils';

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

/**
 * POST handler for the liquidity pool API endpoint
 * @param req The incoming request
 * @returns A JSON response with the liquidity pool information
 */
export async function POST(req: NextRequest) {
  console.log('Liquidity pool API endpoint called');
  
  try {
    const body = await req.json();
    const { poolId } = body;
    console.log('Request body:', body);
    
    // Validate input
    if (!poolId || typeof poolId !== 'string') {
      console.error('Invalid request: pool ID is required or not a string');
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid request: pool ID is required' 
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate pool ID format
    if (!isValidPoolId(poolId)) {
      console.error('Invalid pool ID format:', poolId);
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid pool ID format' 
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get liquidity pool data from the real API
    console.log('Fetching liquidity pool data for:', poolId);
    const poolData = await getLiquidityPoolById(poolId);
    console.log('Pool data fetched:', poolData.success, 'error:', poolData.error || 'none');
    
    if (!poolData.success || !poolData.data || poolData.data.length === 0) {
      console.error('Failed to fetch liquidity pool data:', poolData.error);
      
      return NextResponse.json(
        { 
          success: false,
          error: poolData.error || 'Failed to fetch liquidity pool data. The pool may not exist or the service might be temporarily unavailable.' 
        },
        { status: 404, headers: corsHeaders }
      );
    }
    
    // Return the real data
    return NextResponse.json(poolData, { headers: corsHeaders });
  } catch (error) {
    console.error('Error in liquidity pool API route:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'An error occurred while processing your request' 
      },
      { status: 500, headers: corsHeaders }
    );
  }
} 