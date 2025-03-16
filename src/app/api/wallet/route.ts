import { NextRequest, NextResponse } from 'next/server';
import { getSonicWalletBalance, isValidSonicAddress } from '@/lib/wallet-utils';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json();
    
    // Validate input
    if (!address || typeof address !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request: wallet address is required' },
        { status: 400 }
      );
    }

    // Validate wallet address
    if (!isValidSonicAddress(address)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    // Get wallet balance
    const balance = await getSonicWalletBalance(address);
    
    // Return the balance
    return NextResponse.json(balance);
  } catch (error) {
    console.error('Error in wallet API route:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing your request' },
      { status: 500 }
    );
  }
} 