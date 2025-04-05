# Claude API Proxy

This is a simple API proxy for Anthropic's Claude API, designed to help browser-based applications (like Obsidian plugins) avoid CORS issues when making requests to Claude.

## Features

- Simple API endpoint that proxies requests to Claude
- Supports streaming responses for real-time updates
- Handles CORS headers automatically
- Works with the latest Claude models

## API Usage

Send a POST request to `/api/claude` with the following JSON body:

```json
{
  "apiKey": "your-claude-api-key",
  "model": "claude-3-7-sonnet-20250219", // optional, defaults to claude-3-7-sonnet
  "prompt": "Your prompt text here",
  "max_tokens": 50000, // optional, defaults to 50000
  "temperature": 0.5 // optional, defaults to 0.5
}
```

### Example in JavaScript:

```javascript
// Regular fetch (non-streaming)
async function askClaude(prompt, apiKey) {
  const response = await fetch('https://your-vercel-deployment.vercel.app/api/claude', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      apiKey,
      prompt,
    }),
  });
  
  return await response.json();
}

// Streaming example
function streamFromClaude(prompt, apiKey, onText, onDone, onError) {
  const eventSource = new EventSource('/api/claude?stream=true');
  
  fetch('https://your-vercel-deployment.vercel.app/api/claude', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    },
    body: JSON.stringify({
      apiKey,
      prompt,
    }),
  }).then(response => {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    function readStream() {
      reader.read().then(({ done, value }) => {
        if (done) {
          onDone();
          return;
        }
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.error) {
                onError(data.error);
                return;
              }
              
              if (data.done) {
                onDone();
                return;
              }
              
              if (data.text) {
                onText(data.text);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
        
        readStream();
      }).catch(error => {
        onError(error.message);
      });
    }
    
    readStream();
  }).catch(error => {
    onError(error.message);
  });
}
```

## Deployment

This project is designed to be deployed on Vercel. To deploy your own instance:

1. Fork this repository
2. Connect it to your Vercel account
3. Deploy

No environment variables are needed as all API keys are passed in the request.

## Local Development

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

Then your local server will be available at [http://localhost:3000](http://localhost:3000).

## Security Considerations

- This proxy does not store or log your API keys or prompts
- Keys are only used for the duration of the request
- Consider adding additional authentication if you're deploying this publicly
