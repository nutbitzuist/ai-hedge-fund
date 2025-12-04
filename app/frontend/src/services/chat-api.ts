const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface ChatEvent {
  type: 'start' | 'progress' | 'complete' | 'error';
  status?: string;
  analysis?: string;
  data?: any;
  message?: string;
}

export const chatApi = {
  /**
   * Analyzes stocks from a natural language message
   * @param message The user's message containing stock tickers
   * @param onEvent Callback for SSE events
   * @param onError Callback for errors
   * @returns A function to cancel the request
   */
  analyze: (
    message: string,
    onEvent: (event: ChatEvent) => void,
    onError: (error: Error) => void
  ): (() => void) => {
    const controller = new AbortController();
    const { signal } = controller;

    // Make a POST request to the chat endpoint
    fetch(`${API_BASE_URL}/chat/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
      signal,
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Process the response as a stream of SSE events
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Failed to get response reader');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        // Function to process the stream
        const processStream = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();

              if (done) {
                break;
              }

              // Decode the chunk and add to buffer
              const chunk = decoder.decode(value, { stream: true });
              buffer += chunk;

              // Process any complete events in the buffer (separated by double newlines)
              const events = buffer.split('\n\n');
              buffer = events.pop() || ''; // Keep last partial event in buffer

              for (const eventText of events) {
                if (!eventText.trim()) continue;

                // Parse SSE format: "event: <type>\ndata: <json>"
                const lines = eventText.split('\n');
                let eventType = 'message';
                let data = '';

                for (const line of lines) {
                  if (line.startsWith('event:')) {
                    eventType = line.substring(6).trim();
                  } else if (line.startsWith('data:')) {
                    data = line.substring(5).trim();
                  }
                }

                try {
                  const parsedData = data ? JSON.parse(data) : {};

                  if (eventType === 'start') {
                    onEvent({ type: 'start' });
                  } else if (eventType === 'progress') {
                    onEvent({
                      type: 'progress',
                      status: parsedData.status || parsedData.agent || 'Processing...',
                      analysis: parsedData.analysis,
                    });
                  } else if (eventType === 'complete') {
                    onEvent({
                      type: 'complete',
                      data: parsedData.data || parsedData,
                    });
                  } else if (eventType === 'error') {
                    onEvent({
                      type: 'error',
                      message: parsedData.message || 'An error occurred',
                    });
                  }
                } catch (parseError) {
                  console.error('Failed to parse SSE event:', parseError);
                }
              }
            }
          } catch (error) {
            if (error instanceof Error && error.name !== 'AbortError') {
              onError(error);
            }
          }
        };

        processStream();
      })
      .catch(error => {
        if (error.name !== 'AbortError') {
          onError(error);
        }
      });

    // Return abort function
    return () => {
      controller.abort();
    };
  },
};

