import { NextRequest, NextResponse } from 'next/server';
import { Message, streamAIResponse } from '@/lib/ai-utils';
import { OpenAI } from 'openai';
import { SONIC_AI_SYSTEM_PROMPT } from '@/lib/ai-config';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set');
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    const { messages } = await req.json();
    
    // Validate input
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid request: messages array is required' },
        { status: 400 }
      );
    }

    // Initialize OpenAI client directly in the API route
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Ensure the system prompt is included
    const fullMessages = [
      { role: 'system', content: SONIC_AI_SYSTEM_PROMPT },
      ...messages.filter(msg => msg.role !== 'system')
    ];

    // Create a streaming response
    const stream = await openai.chat.completions.create({
      model: process.env.AI_MODEL || 'gpt-4o-mini',
      messages: fullMessages as any,
      temperature: 0.7,
      max_tokens: 1000,
      stream: true,
    });

    // Convert the stream to a readable stream
    const textEncoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            controller.enqueue(textEncoder.encode(content));
          }
        }
        controller.close();
      },
    });

    // Return the stream as a response
    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error in chat API route:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing your request' },
      { status: 500 }
    );
  }
} 