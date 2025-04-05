export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <main className="flex flex-col items-center max-w-3xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-6">Claude API Proxy</h1>
        <p className="text-xl mb-8">
          This service provides a proxy for Claude API calls to avoid CORS issues in browser-based applications.
        </p>
        <div className="bg-gray-100 p-6 rounded-lg w-full mb-8">
          <h2 className="text-2xl font-semibold mb-4">API Usage</h2>
          <p className="mb-4 text-left">
            Send a POST request to <code className="bg-gray-200 px-2 py-1 rounded">/api/claude</code> with:
          </p>
          <pre className="bg-gray-800 text-white p-4 rounded text-left overflow-x-auto">
{`{
  "apiKey": "your-claude-api-key",
  "model": "claude-3-7-sonnet-20250219",
  "prompt": "Your prompt text here",
  "max_tokens": 50000,
  "temperature": 0.5
}`}
          </pre>
          <p className="mt-4 text-left">
            The API supports streaming responses with proper server-sent events format.
          </p>
        </div>
        <p className="text-gray-600 text-sm">
          Built with Next.js to support Obsidian plugins and other browser-based applications.
        </p>
      </main>
    </div>
  );
}
