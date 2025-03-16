import { NextRequest, NextResponse } from 'next/server';
import { requestFaucetTokens } from '@/lib/faucet-utils';
import { isValidSonicAddress } from '@/lib/wallet-utils';

/**
 * POST handler for the faucet API endpoint
 * @param req The incoming request
 * @returns A JSON response with the faucet result
 */
export async function POST(req: NextRequest) {
  try {
    // Parse the request body
    const body = await req.json();
    const { address } = body;

    // Validate input
    if (!address) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Please provide a wallet address to receive tokens.' 
        },
        { status: 400 }
      );
    }

    // Validate wallet address
    if (!isValidSonicAddress(address)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'The wallet address format is invalid. Please provide a valid Sonic wallet address.' 
        },
        { status: 400 }
      );
    }

    // Request tokens from the faucet
    const faucetResponse = await requestFaucetTokens(address);

    // Return the response
    if (!faucetResponse.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: faucetResponse.message || faucetResponse.error || 'Failed to request tokens' 
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: faucetResponse.data,
      message: faucetResponse.message
    });
  } catch (error) {
    console.error('Error in faucet API:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Sorry, there was an error connecting to the faucet service. Please try again later.' 
      },
      { status: 500 }
    );
  }
} 