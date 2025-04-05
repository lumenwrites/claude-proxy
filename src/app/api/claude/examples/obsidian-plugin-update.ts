// Example code to modify in your Obsidian plugin to use the API proxy
// Replace your current sendToClaudeAPI method with this:

async sendToClaudeAPI(content: string): Promise<string> {
  try {
    // The URL of your deployed Claude API proxy
    const proxyUrl = 'https://your-proxy-url.vercel.app/api/claude';
    
    // Create a result string to accumulate response
    let responseText = "";
    
    // Fetch with streaming
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({
        apiKey: this.settings.claudeApiKey,
        prompt: content,
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

// And update your sendActiveFileToClaudeWithPrompt method:

async sendActiveFileToClaudeWithPrompt(promptSettings: CustomPromptSettings) {
  try {
    if (!this.settings.claudeApiKey) {
      new Notice(
        "Claude API key is not set. Please set it in the plugin settings."
      );
      return;
    }

    const result = await this.generatePrompt(promptSettings);
    if (!result) return;

    // Create an empty output file first
    await this.app.vault.create(result.outputFilePath, "");
    const outputFile = this.app.vault.getAbstractFileByPath(result.outputFilePath) as TFile;
    
    if (!outputFile) {
      new Notice("Failed to create output file.");
      return;
    }

    // Set streaming status
    this.isStreaming = true;
    this.statusBarItem.setText('Streaming from Claude...');
    setIcon(this.statusBarItem, 'loader');
    this.statusBarItem.addClass('is-active');

    // Send to Claude via API proxy
    new Notice("Sending to Claude and streaming response...");
    
    // The URL of your deployed Claude API proxy
    const proxyUrl = 'https://your-proxy-url.vercel.app/api/claude';
    
    let responseText = "";
    let lastUpdateTime = Date.now();
    const updateInterval = this.settings.streamingUpdateInterval;
    let tokenCount = 0;
    
    try {
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          apiKey: this.settings.claudeApiKey,
          prompt: result.combinedContent,
          model: "claude-3-7-sonnet-20250219",
          max_tokens: 50000,
          temperature: 0.5
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Could not get response reader');
      }
      
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.error) {
                throw new Error(data.error);
              }
              
              if (data.done) {
                // Final update to the file
                await this.app.vault.modify(outputFile, responseText);
                
                // Reset streaming status
                this.isStreaming = false;
                this.statusBarItem.setText('');
                this.statusBarItem.removeClass('is-active');
                
                new Notice("Response from Claude completed!");
                return;
              }
              
              if (data.text) {
                // Append text and estimate tokens
                responseText += data.text;
                tokenCount += data.text.split(/\s+/).length;
                
                // Update status bar with token count
                this.statusBarItem.setText(`Streaming from Claude: ~${tokenCount} tokens`);
                
                // Update file periodically
                const currentTime = Date.now();
                if (currentTime - lastUpdateTime > updateInterval) {
                  await this.app.vault.modify(outputFile, responseText);
                  lastUpdateTime = currentTime;
                }
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
      
      // Make sure final content is written
      await this.app.vault.modify(outputFile, responseText);
      
    } catch (error) {
      console.error("Error streaming from Claude:", error);
      new Notice(`Error: ${error instanceof Error ? error.message : String(error)}`);
      
      // Write what we have so far
      if (responseText) {
        await this.app.vault.modify(outputFile, responseText);
      }
      
      // Reset streaming status
      this.isStreaming = false;
      this.statusBarItem.setText('');
      this.statusBarItem.removeClass('is-active');
    }
    
  } catch (error) {
    console.error("Error in Claude processing:", error);
    new Notice(
      "Error in Claude processing. Check console for details."
    );
    
    // Reset streaming status
    this.isStreaming = false;
    this.statusBarItem.setText('');
    this.statusBarItem.removeClass('is-active');
  }
} 