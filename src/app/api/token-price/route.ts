import { NextRequest, NextResponse } from 'next/server';
import { getTokenPrices } from '@/lib/token-utils';

export const runtime = 'edge';

// Define the expected Sega API response type
interface SegaTokenPriceResponse {
  success: boolean;
  data?: {
    priceInUSD: number;
  };
  error?: string;
}

/**
 * POST handler for the token price API endpoint
 * @param req The incoming request
 * @returns A JSON response with the token price information
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Token price API called');
    
    // Parse the request body
    const body = await request.json();
    const { mintAddress } = body;
    
    console.log('Mint address received:', mintAddress);
    
    if (!mintAddress) {
      console.log('No mint address provided');
      return NextResponse.json(
        { success: false, error: 'No mint address provided' },
        { status: 400 }
      );
    }
    
    // Convert single mint address to array
    const mintAddresses = Array.isArray(mintAddress) ? mintAddress : [mintAddress];
    
    console.log('Fetching token prices for:', mintAddresses);
    
    // Special handling for SONIC token
    const SONIC_MINT = 'mrujEYaN1oyQXDHeYNxBYpxWKVkQ2XsGxfznpifu4aL';
    const hasSonicToken = mintAddresses.includes(SONIC_MINT);
    
    if (hasSonicToken && mintAddresses.length === 1) {
      console.log('Direct SONIC token price request detected');
      
      try {
        // Make a direct call to the Sega API for SONIC token price
        const response = await fetch(`https://api.sega.so/sega/price?mint=${SONIC_MINT}`, {
          method: 'GET',
          headers: {
            'accept': 'application/json',
          },
        });
        
        if (!response.ok) {
          console.error(`Failed to fetch SONIC price: ${response.status} ${response.statusText}`);
          return NextResponse.json(
            { success: false, error: `Failed to fetch SONIC price: ${response.status} ${response.statusText}` },
            { status: response.status }
          );
        }
        
        const data = await response.json() as SegaTokenPriceResponse;
        console.log('SONIC price API response:', data);
        
        if (data.success && data.data && data.data.priceInUSD !== undefined) {
          const price = data.data.priceInUSD;
          
          // Return the price in the expected format
          return NextResponse.json({
            success: true,
            data: {
              [SONIC_MINT]: price
            }
          });
        } else {
          console.error('No price data found for SONIC token');
          return NextResponse.json(
            { success: false, error: 'No price data found for SONIC token' },
            { status: 404 }
          );
        }
      } catch (error) {
        console.error('Error fetching SONIC price directly:', error);
        return NextResponse.json(
          { 
            success: false, 
            error: error instanceof Error ? error.message : 'Failed to fetch SONIC token price' 
          },
          { status: 500 }
        );
      }
    }
    
    // For other tokens or multiple tokens including SONIC, use the regular flow
    const result = await getTokenPrices(mintAddresses);
    
    console.log('Token price result:', result);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: result.prices
    });
  } catch (error) {
    console.error('Error in token price API:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'An error occurred while fetching token price' 
      },
      { status: 500 }
    );
  }
} 