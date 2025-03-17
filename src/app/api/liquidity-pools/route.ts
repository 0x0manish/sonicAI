import { NextRequest, NextResponse } from 'next/server';
import { getLiquidityPools, LiquidityPoolInfo } from '@/lib/liquidity-pool-utils';

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

// Fallback data in case the API is down
const fallbackPools: LiquidityPoolInfo[] = [
  {
    id: 'DgMweMfMbmPFChTuAvTf4nriQDWpf9XX3g66kod9nsR4',
    type: 'constant-product',
    programId: 'CLMM9tUoggJu2wagPkkqs9eFG4BWhVBZWkP1qv3Sp7tR',
    mintA: {
      chainId: 1,
      address: 'So11111111111111111111111111111111111111112',
      programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
      symbol: 'SOL',
      name: 'Wrapped SOL',
      decimals: 9
    },
    mintB: {
      chainId: 1,
      address: 'Sonic6QS3yVuQA8YBA8zGYp9Y7u5zGEAJVYbSYcqXsAJV',
      programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Sonic6QS3yVuQA8YBA8zGYp9Y7u5zGEAJVYbSYcqXsAJV/logo.png',
      symbol: 'SONIC',
      name: 'SONIC',
      decimals: 9
    },
    price: 0.0025,
    mintAmountA: 1000000,
    mintAmountB: 400000000,
    feeRate: 0.003,
    tvl: 50000,
    day: {
      volume: 15000,
      volumeQuote: 6000000,
      volumeFee: 45,
      apr: 0.15,
      feeApr: 0.05,
      priceMin: 0.0023,
      priceMax: 0.0027,
      rewardApr: []
    },
    week: {
      volume: 75000,
      volumeQuote: 30000000,
      volumeFee: 225,
      apr: 0.12,
      feeApr: 0.04,
      priceMin: 0.0022,
      priceMax: 0.0028,
      rewardApr: []
    },
    month: {
      volume: 300000,
      volumeQuote: 120000000,
      volumeFee: 900,
      apr: 0.10,
      feeApr: 0.03,
      priceMin: 0.0020,
      priceMax: 0.0030,
      rewardApr: []
    },
    lpMint: {
      chainId: 1,
      address: 'LPSoLSonicPoo1111111111111111111111111111',
      programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      logoURI: '',
      symbol: 'LP-SOL-SONIC',
      name: 'LP SOL-SONIC',
      decimals: 9
    },
    lpPrice: 0.05,
    lpAmount: 2000000
  }
];

export async function GET(request: NextRequest) {
  console.log('Liquidity pools API endpoint called');
  
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const pageParam = searchParams.get('page');
    const pageSizeParam = searchParams.get('pageSize');
    const useFallback = searchParams.get('fallback') === 'true';
    
    console.log('Requested page:', pageParam, 'pageSize:', pageSizeParam, 'fallback:', useFallback);
    
    // Validate and parse parameters
    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const pageSize = pageSizeParam ? parseInt(pageSizeParam, 10) : 10;
    
    if (isNaN(page) || page < 1) {
      console.error('Invalid page parameter:', pageParam);
      return NextResponse.json(
        { success: false, error: 'Invalid page parameter. Page must be a positive integer.' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
      console.error('Invalid pageSize parameter:', pageSizeParam);
      return NextResponse.json(
        { success: false, error: 'Invalid pageSize parameter. PageSize must be between 1 and 100.' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Use fallback data if requested or if the API is down
    if (useFallback) {
      console.log('Using fallback data as requested');
      const response = NextResponse.json(
        { 
          success: true, 
          data: {
            count: fallbackPools.length,
            data: fallbackPools,
            hasNextPage: false
          }
        },
        { status: 200, headers: corsHeaders }
      );
      return response;
    }
    
    // Fetch liquidity pools
    console.log('Fetching liquidity pools with page:', page, 'pageSize:', pageSize);
    const poolsData = await getLiquidityPools(page, pageSize);
    console.log('Pools data fetched:', poolsData.success, 'error:', poolsData.error || 'none');
    
    if (!poolsData.success || !poolsData.data) {
      console.error('Failed to fetch liquidity pools:', poolsData.error);
      
      // Use fallback data if the API is down
      console.log('API failed, using fallback data');
      return NextResponse.json(
        { 
          success: true, 
          data: {
            count: fallbackPools.length,
            data: fallbackPools,
            hasNextPage: false
          }
        },
        { status: 200, headers: corsHeaders }
      );
    }
    
    // Log the data structure to help debug
    console.log('Pools data structure:', 
      'count:', poolsData.data.count, 
      'hasNextPage:', poolsData.data.hasNextPage,
      'pools count:', poolsData.data.data.length
    );
    
    // Return the pools data
    const response = NextResponse.json(
      { success: true, data: poolsData.data },
      { status: 200, headers: corsHeaders }
    );
    
    return response;
  } catch (error) {
    console.error('Error processing liquidity pools request:', error);
    
    // Use fallback data if there's an error
    console.log('Error occurred, using fallback data');
    return NextResponse.json(
      { 
        success: true, 
        data: {
          count: fallbackPools.length,
          data: fallbackPools,
          hasNextPage: false
        }
      },
      { status: 200, headers: corsHeaders }
    );
  }
} 