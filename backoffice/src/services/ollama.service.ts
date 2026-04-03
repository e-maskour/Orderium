/**
 * Ollama Service
 * Handles streaming chat communication with local Ollama instance
 */

import {
  OllamaChatMessage,
  ChatStreamOptions,
  StreamChunk,
  ToolCall,
  ToolResult,
  OLLAMA_BASE_URL,
  REQUEST_TIMEOUT,
  MAX_RETRIES,
  DEFAULT_MODEL,
} from '../types/aiAssistant';

export class OllamaService {
  private abortController: AbortController | null = null;

  /**
   * Streams chat responses from Ollama with automatic retry and backpressure handling
   */
  async chatStream(options: ChatStreamOptions): Promise<void> {
    const {
      messages,
      model = DEFAULT_MODEL,
      temperature = 0.7,
      tools,
      signal,
      onChunk,
      onToolCall,
      onError,
      onComplete,
    } = options;

    // Merge external signal with internal abort controller
    this.abortController = new AbortController();
    const combinedSignal = signal
      ? this.createCombinedSignal(signal, this.abortController.signal)
      : this.abortController.signal;

    let retries = 0;

    while (retries <= MAX_RETRIES) {
      try {
        await this._executeStream({
          messages,
          model,
          temperature,
          tools,
          signal: combinedSignal,
          onChunk,
          onToolCall,
        });

        onComplete?.();
        return; // Success
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw error; // User cancelled, don't retry
        }

        retries++;
        if (retries > MAX_RETRIES) {
          onError?.(error as Error);
          throw error;
        }

        // Exponential backoff
        await this.delay(Math.pow(2, retries) * 1000);
      }
    }
  }

  private async _executeStream(options: {
    messages: OllamaChatMessage[];
    model: string;
    temperature: number;
    tools?: any[];
    signal: AbortSignal;
    onChunk: (text: string) => void;
    onToolCall?: (toolCall: ToolCall) => Promise<ToolResult>;
  }): Promise<void> {
    const { messages, model, temperature, tools, signal, onChunk, onToolCall } = options;

    const requestBody: any = {
      model,
      messages: this.formatMessages(messages),
      stream: true,
      options: { temperature },
    };

    // Include tools if provided
    if (tools && tools.length > 0) {
      requestBody.tools = tools;
    }

    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal,
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body reader available');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    const toolCallsDetected: ToolCall[] = [];

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      // Decode chunk and handle partial JSON
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');

      // Keep incomplete line in buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const chunk: StreamChunk = JSON.parse(line);

          // Stream text content
          if (chunk.message?.content) {
            onChunk(chunk.message.content);
          }

          // Detect tool calls
          if (chunk.message?.tool_calls && onToolCall) {
            toolCallsDetected.push(...chunk.message.tool_calls);
          }

          // Execute tool calls when stream is done
          if (chunk.done && toolCallsDetected.length > 0 && onToolCall) {
            // Note: Tool execution happens after streaming completes
            // The agent layer will handle re-streaming with results
            for (const toolCall of toolCallsDetected) {
              await onToolCall(toolCall);
            }
          }
        } catch (parseError) {
          console.warn('Failed to parse chunk:', line, parseError);
          // Continue processing other chunks
        }
      }
    }
  }

  /**
   * Format messages for Ollama API, injecting tool results
   */
  private formatMessages(messages: OllamaChatMessage[]): any[] {
    return messages
      .map((msg) => {
        const formatted: any = {
          role: msg.role,
          content: msg.content,
        };

        if (msg.tool_calls) {
          formatted.tool_calls = msg.tool_calls;
        }

        if (msg.tool_results) {
          // Inject tool results as separate messages
          // (Ollama expects tool results as role: 'tool')
          return [
            formatted,
            ...msg.tool_results.map((result) => ({
              role: 'tool',
              content: result.content,
              tool_call_id: result.tool_call_id,
            })),
          ];
        }

        return formatted;
      })
      .flat();
  }

  private createCombinedSignal(signal1: AbortSignal, signal2: AbortSignal): AbortSignal {
    const controller = new AbortController();

    const abort = () => controller.abort();
    signal1.addEventListener('abort', abort);
    signal2.addEventListener('abort', abort);

    return controller.signal;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Cancel active stream
   */
  cancel(): void {
    this.abortController?.abort();
  }

  /**
   * Check if Ollama service is available
   */
  async checkAvailability(): Promise<boolean> {
    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
      const data = await response.json();
      return data.models?.map((m: any) => m.name) || [];
    } catch {
      return [];
    }
  }
}

// Singleton instance
export const ollamaService = new OllamaService();
