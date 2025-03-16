import { NextRequest, NextResponse } from 'next/server';
import { getSonicStats } from '@/lib/stats-utils';

export const runtime = 'edge';

/**
 * GET handler for the Sonic chain stats API endpoint
 * @param req The incoming request
 * @returns A JSON response with the Sonic chain stats
 */
export async function GET(req: NextRequest) {
  try {
    // Get Sonic chain stats
    const stats = await getSonicStats();
    
    // Return the stats
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error in stats API:', error);
    return NextResponse.json(
      { 
        success: false,
        tvl: 0,
        volume24: 0,
        error: 'Sorry, there was an error fetching Sonic chain stats. Please try again later.' 
      },
      { status: 500 }
    );
  }
} 