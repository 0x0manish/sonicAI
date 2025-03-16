import { NextRequest, NextResponse } from 'next/server';
import { getTokenPrices, isValidTokenMint } from '@/lib/token-utils';

export const runtime = 'edge';

/**
 * POST handler for the token price API endpoint
 * @param req The incoming request
 * @returns A JSON response with the token price information
 */
export async function POST(req: NextRequest) {
  try {
    // Parse the request body
    const body = await req.json();
    const { mints } = body;
    
    // Validate input
    if (!mints || !Array.isArray(mints) || mints.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          prices: {},
          error: 'Please provide at least one token mint address' 
        },
        { status: 400 }
      );
    }

    // Validate mint addresses
    const invalidMints = mints.filter(mint => !isValidTokenMint(mint));
    if (invalidMints.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          prices: {},
          error: `Invalid token mint address format: ${invalidMints.join(', ')}` 
        },
        { status: 400 }
      );
    }

    // Get token prices
    const priceResponse = await getTokenPrices(mints);
    
    // Return the response
    return NextResponse.json(priceResponse);
  } catch (error) {
    console.error('Error in token price API:', error);
    return NextResponse.json(
      { 
        success: false,
        prices: {},
        error: 'Sorry, there was an error fetching token prices. Please try again later.' 
      },
      { status: 500 }
    );
  }
} 