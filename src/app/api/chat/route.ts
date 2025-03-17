import { NextRequest, NextResponse } from 'next/server';
import { Message, streamAIResponse } from '@/lib/ai-utils';
import { OpenAI } from 'openai';
import { SONIC_AI_SYSTEM_PROMPT } from '@/lib/ai-config';
import { getEnvVars } from '@/lib/env-utils';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    // Get environment variables with fallbacks
    const env = getEnvVars();
    
    // Check if OpenAI API key is available
    if (!env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set');
      
      // In development mode, provide a fallback response
      if (env.NODE_ENV === 'development') {
        console.warn('Using fallback response in development mode');
        return new Response('This is a fallback response since the OpenAI API key is not configured. In production, this would use the actual OpenAI API.', {
          headers: {
            'Content-Type': 'text/plain',
            'Cache-Control': 'no-cache',
          },
        });
      }
      
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
      apiKey: env.OPENAI_API_KEY,
    });

    // Ensure the system prompt is included
    const fullMessages = [
      { role: 'system', content: SONIC_AI_SYSTEM_PROMPT },
      ...messages.filter(msg => msg.role !== 'system')
    ];

    // Log the request for debugging
    console.log('Chat API request:', {
      model: env.AI_MODEL,
      messageCount: fullMessages.length,
      lastUserMessage: fullMessages.filter(m => m.role === 'user').pop()?.content.substring(0, 100) + '...'
    });

    try {
      // Create a streaming response
      const stream = await openai.chat.completions.create({
        model: env.AI_MODEL,
        messages: fullMessages as any,
        temperature: 0.7,
        max_tokens: 1000,
        stream: true,
      });

      // Convert the stream to a readable stream
      const textEncoder = new TextEncoder();
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              const content = chunk.choices[0]?.delta?.content || '';
              if (content) {
                controller.enqueue(textEncoder.encode(content));
              }
            }
            controller.close();
          } catch (streamError) {
            console.error('Error in stream processing:', streamError);
            controller.enqueue(textEncoder.encode('Sorry, there was an error generating a response. Please try again.'));
            controller.close();
          }
        },
      });

      // Return the stream as a response
      return new Response(readableStream, {
        headers: {
          'Content-Type': 'text/plain',
          'Cache-Control': 'no-cache',
        },
      });
    } catch (openaiError) {
      console.error('OpenAI API error:', openaiError);
      return new Response('Sorry, there was an error connecting to the AI service. Please try again later.', {
        status: 500,
        headers: {
          'Content-Type': 'text/plain',
          'Cache-Control': 'no-cache',
        },
      });
    }
  } catch (error) {
    console.error('Error in chat API route:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing your request' },
      { status: 500 }
    );
  }
} 