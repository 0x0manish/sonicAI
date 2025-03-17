import { NextRequest, NextResponse } from 'next/server';
import { getTokenDetails, isValidTokenMint } from '@/lib/token-utils';

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
 * POST handler for the token details API endpoint
 * @param req The incoming request
 * @returns A JSON response with the token details
 */
export async function POST(req: NextRequest) {
  console.log('Token details API endpoint called');
  
  try {
    const body = await req.json();
    const { mintAddress } = body;
    console.log('Request body:', body);
    
    // Validate input
    if (!mintAddress || typeof mintAddress !== 'string') {
      console.error('Invalid request: mint address is required or not a string');
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid request: mint address is required' 
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate mint address format
    if (!isValidTokenMint(mintAddress)) {
      console.error('Invalid mint address format:', mintAddress);
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid mint address format' 
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get token details from the API
    console.log('Fetching token details for:', mintAddress);
    const tokenData = await getTokenDetails(mintAddress);
    console.log('Token data fetched:', tokenData.success, 'error:', tokenData.error || 'none');
    
    if (!tokenData.success || !tokenData.data || tokenData.data.length === 0) {
      console.error('Failed to fetch token details:', tokenData.error);
      
      return NextResponse.json(
        { 
          success: false,
          error: tokenData.error || 'Failed to fetch token details. The token may not exist or the service might be temporarily unavailable.' 
        },
        { status: 404, headers: corsHeaders }
      );
    }
    
    // Return the data
    return NextResponse.json(tokenData, { headers: corsHeaders });
  } catch (error) {
    console.error('Error in token details API route:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'An error occurred while processing your request' 
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * GET handler for the token details API endpoint
 * @param req The incoming request
 * @returns A JSON response with the token details
 */
export async function GET(req: NextRequest) {
  console.log('Token details API endpoint called (GET)');
  
  try {
    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const mintAddress = searchParams.get('mintAddress');
    console.log('Query parameters:', { mintAddress });
    
    // Validate input
    if (!mintAddress) {
      console.error('Invalid request: mint address is required');
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid request: mint address is required' 
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate mint address format
    if (!isValidTokenMint(mintAddress)) {
      console.error('Invalid mint address format:', mintAddress);
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid mint address format' 
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get token details from the API
    console.log('Fetching token details for:', mintAddress);
    const tokenData = await getTokenDetails(mintAddress);
    console.log('Token data fetched:', tokenData.success, 'error:', tokenData.error || 'none');
    
    if (!tokenData.success || !tokenData.data || tokenData.data.length === 0) {
      console.error('Failed to fetch token details:', tokenData.error);
      
      return NextResponse.json(
        { 
          success: false,
          error: tokenData.error || 'Failed to fetch token details. The token may not exist or the service might be temporarily unavailable.' 
        },
        { status: 404, headers: corsHeaders }
      );
    }
    
    // Return the data
    return NextResponse.json(tokenData, { headers: corsHeaders });
  } catch (error) {
    console.error('Error in token details API route (GET):', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'An error occurred while processing your request' 
      },
      { status: 500, headers: corsHeaders }
    );
  }
} 