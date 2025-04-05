import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Define the request body type
type RequestBody = {
  apiKey: string;
  model?: string;
  prompt: string;
  max_tokens?: number;
  temperature?: number;
};

// Helper function to validate the request body
function validateRequestBody(body: unknown): { isValid: boolean; error: string | null } {
  if (!body) {
    return { isValid: false, error: 'Missing request body' };
  }
  
  const typedBody = body as Partial<RequestBody>;
  
  if (!typedBody.apiKey) {
    return { isValid: false, error: 'Missing API key' };
  }
  
  if (!typedBody.prompt) {
    return { isValid: false, error: 'Missing prompt' };
  }
  
  return { isValid: true, error: null };
}

export async function POST(request: NextRequest) {
  try {
    // Parse the JSON request body
    const body = await request.json();
    
    // Validate the request body
    const validation = validateRequestBody(body);
    if (!validation.isValid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
    
    // Extract parameters from the request body
    const {
      apiKey,
      model = 'claude-3-7-sonnet-20250219',
      prompt,
      max_tokens = 50000,
      temperature = 0.5,
    } = body as RequestBody;
    
    // Create a new Anthropic client
    const client = new Anthropic({
      apiKey,
    });
    
    // Create a new ReadableStream for streaming the response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Set up the message stream from Claude
          const messageStream = await client.messages.stream({
            model,
            max_tokens,
            temperature,
            messages: [
              {
                role: 'user',
                content: prompt,
              },
            ],
          });
          
          // Listen for text chunks
          messageStream.on('text', (text) => {
            // Write the text chunk to the response stream
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ text })}\n\n`));
          });
          
          // Listen for error events
          messageStream.on('error', (error: Error) => {
            console.error('Error in Claude API streaming:', error);
            controller.enqueue(
              new TextEncoder().encode(`data: ${JSON.stringify({ error: error.message })}\n\n`)
            );
            controller.close();
          });
          
          // Listen for the end event
          messageStream.on('end', () => {
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ done: true })}\n\n`));
            controller.close();
          });
        } catch (error) {
          console.error('Error initializing stream:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`)
          );
          controller.close();
        }
      },
    });
    
    // Return the response with the stream
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
} 