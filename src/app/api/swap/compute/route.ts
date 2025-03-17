import { NextRequest, NextResponse } from 'next/server';
import { computeSwap, isValidMintAddress, solToLamports, SOL_MINT } from '@/lib/swap-utils';

export const runtime = 'edge';

/**
 * POST handler for the swap compute API endpoint
 * @param req The request object
 * @returns A JSON response with the swap computation
 */
export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const { inputMint, outputMint, amount, slippageBps = 50 } = await req.json();
    
    // Validate input parameters
    if (!inputMint || typeof inputMint !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Input mint is required and must be a string' },
        { status: 400 }
      );
    }
    
    if (!outputMint || typeof outputMint !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Output mint is required and must be a string' },
        { status: 400 }
      );
    }
    
    if (amount === undefined || amount === null || isNaN(Number(amount))) {
      return NextResponse.json(
        { success: false, error: 'Amount is required and must be a number' },
        { status: 400 }
      );
    }
    
    // Validate mint addresses
    if (!isValidMintAddress(inputMint)) {
      return NextResponse.json(
        { success: false, error: 'Invalid input mint address' },
        { status: 400 }
      );
    }
    
    if (!isValidMintAddress(outputMint)) {
      return NextResponse.json(
        { success: false, error: 'Invalid output mint address' },
        { status: 400 }
      );
    }
    
    // Convert amount to lamports if input is SOL
    let amountInLamports = Number(amount);
    if (inputMint === SOL_MINT && amountInLamports < 1_000_000) {
      // If amount is less than 1 million, assume it's in SOL and convert to lamports
      amountInLamports = solToLamports(amountInLamports);
    }
    
    // Compute the swap
    const swapResult = await computeSwap({
      inputMint,
      outputMint,
      amount: amountInLamports,
      slippageBps: Number(slippageBps)
    });
    
    // Return the result
    return NextResponse.json(swapResult);
  } catch (error) {
    console.error('Error in swap compute API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'An error occurred while computing the swap' 
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler for the swap compute API endpoint
 * @param req The request object
 * @returns A JSON response with the swap computation
 */
export async function GET(req: NextRequest) {
  try {
    // Get query parameters
    const url = new URL(req.url);
    const inputMint = url.searchParams.get('inputMint');
    const outputMint = url.searchParams.get('outputMint');
    const amount = url.searchParams.get('amount');
    const slippageBps = url.searchParams.get('slippageBps') || '50';
    
    // Validate input parameters
    if (!inputMint) {
      return NextResponse.json(
        { success: false, error: 'Input mint is required' },
        { status: 400 }
      );
    }
    
    if (!outputMint) {
      return NextResponse.json(
        { success: false, error: 'Output mint is required' },
        { status: 400 }
      );
    }
    
    if (!amount) {
      return NextResponse.json(
        { success: false, error: 'Amount is required' },
        { status: 400 }
      );
    }
    
    // Validate mint addresses
    if (!isValidMintAddress(inputMint)) {
      return NextResponse.json(
        { success: false, error: 'Invalid input mint address' },
        { status: 400 }
      );
    }
    
    if (!isValidMintAddress(outputMint)) {
      return NextResponse.json(
        { success: false, error: 'Invalid output mint address' },
        { status: 400 }
      );
    }
    
    // Convert amount to lamports if input is SOL
    let amountInLamports = Number(amount);
    if (inputMint === SOL_MINT && amountInLamports < 1_000_000) {
      // If amount is less than 1 million, assume it's in SOL and convert to lamports
      amountInLamports = solToLamports(amountInLamports);
    }
    
    // Compute the swap
    const swapResult = await computeSwap({
      inputMint,
      outputMint,
      amount: amountInLamports,
      slippageBps: Number(slippageBps)
    });
    
    // Return the result
    return NextResponse.json(swapResult);
  } catch (error) {
    console.error('Error in swap compute API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'An error occurred while computing the swap' 
      },
      { status: 500 }
    );
  }
} 