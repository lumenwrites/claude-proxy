# Claude API Proxy Usage Guide

## Deploying to Vercel

This project is designed to be easily deployed to Vercel. Follow these steps to deploy your own instance:

1. Create a GitHub repository for this codebase
2. Push the code to your repository
3. Go to [Vercel](https://vercel.com) and sign in
4. Click "New Project"
5. Import the GitHub repository you created
6. Leave all settings at their defaults
7. Click "Deploy"

Once deployed, Vercel will provide you with a URL for your API proxy, such as `https://claude-proxy-yourusername.vercel.app`.

## Using with an Obsidian Plugin

To use this API proxy with an Obsidian plugin, you'll need to modify your plugin code to use the proxy instead of directly calling the Claude API. Here's how to update your plugin:

1. Replace direct calls to the Claude API with calls to your proxy
2. Make sure to include your Claude API key in the request body
3. Handle the streaming response for real-time updates

### Example Integration

```typescript
// In your Obsidian plugin

// Replace this URL with your deployed Vercel app
const CLAUDE_PROXY_URL = 'https://claude-proxy-yourusername.vercel.app/api/claude';

// Example function to send a prompt to Claude via the proxy
async function sendToClaudeViaProxy(prompt: string, apiKey: string): Promise<string> {
  try {
    // Create a result string to accumulate response
    let responseText = "";
    
    // Fetch with streaming
    const response = await fetch(CLAUDE_PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({
        apiKey,
        prompt,
        model: "claude-3-7-sonnet-20250219",
        max_tokens: 50000,
        temperature: 0.5
      }),
    });
    
    // Check if response is ok
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // Read the stream
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Could not get response reader');
    }
    
    const decoder = new TextDecoder();
    
    // Read the stream chunks
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }
      
      // Decode the chunk
      const chunk = decoder.decode(value, { stream: true });
      
      // Process the SSE format
      const lines = chunk.split('\n\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            
            if (data.error) {
              throw new Error(data.error);
            }
            
            if (data.done) {
              // Stream is complete
              continue;
            }
            
            if (data.text) {
              // Append the text to our response
              responseText += data.text;
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
    
    return responseText;
  } catch (error) {
    console.error("Error calling Claude API via proxy:", error);
    throw new Error(
      "Failed to get response from Claude: " +
        (error instanceof Error ? error.message : String(error))
    );
  }
}
```

## Testing the Proxy

You can test your deployed proxy using curl:

```bash
curl -X POST https://claude-proxy-yourusername.vercel.app/api/claude \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "your-claude-api-key",
    "prompt": "Hello, Claude! How are you today?",
    "model": "claude-3-7-sonnet-20250219"
  }'
```

For streaming responses, add the appropriate Accept header:

```bash
curl -X POST https://claude-proxy-yourusername.vercel.app/api/claude \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "apiKey": "your-claude-api-key",
    "prompt": "Hello, Claude! How are you today?",
    "model": "claude-3-7-sonnet-20250219"
  }'
```

## Security Considerations

- This proxy sends your API key to the Claude API but doesn't store it
- Consider adding authentication to your proxy if you're deploying it publicly
- For added security, you could modify the code to use environment variables for your own API key 