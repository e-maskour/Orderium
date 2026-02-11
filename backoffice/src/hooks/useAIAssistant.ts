/**
 * AI Assistant Hook
 * Main hook that orchestrates the AI assistant functionality
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  AssistantMessage,
  OllamaChatMessage,
  MessageStatus,
  AppContext,
  MAX_MESSAGE_HISTORY,
} from '../types/aiAssistant';
import { ollamaService } from '../services/ollama.service';
import { toolRegistry } from '../services/toolRegistry.service';
import { AppContextProvider } from '../services/appContext.service';
import { SystemMessageBuilder } from '../services/systemMessage.service';
import { SafetyFilters } from '../services/safetyFilters.service';

// Import and register tools
import {
  getCurrentPageTool,
  analyzeSelectionTool,
  searchHelpTool,
} from '../services/tools/readTools';
import {
  getDataTool,
  aggregateDataTool,
} from '../services/tools/dataTools';

// Register tools
toolRegistry.register(getCurrentPageTool);
toolRegistry.register(analyzeSelectionTool);
toolRegistry.register(searchHelpTool);
toolRegistry.register(getDataTool);
toolRegistry.register(aggregateDataTool);

export function useAIAssistant() {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState('');
  
  const location = useLocation();
  const sessionId = useRef(crypto.randomUUID());
  const messageIdCounter = useRef(0);
  const streamingContentRef = useRef('');

  // Load messages from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('ai_assistant_history');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const loadedMessages = parsed.slice(-MAX_MESSAGE_HISTORY);
        setMessages(loadedMessages);
        
        // Sync messageIdCounter with loaded messages
        const maxId = loadedMessages.reduce((max: number, msg: AssistantMessage) => {
          const match = msg.id.match(/^msg-(\d+)$/);
          if (match) {
            const id = parseInt(match[1], 10);
            return id > max ? id : max;
          }
          return max;
        }, 0);
        messageIdCounter.current = maxId;
      } catch {
        // Invalid data, ignore
      }
    }
  }, []);

  // Save messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('ai_assistant_history', JSON.stringify(messages));
    }
  }, [messages]);

  /**
   * Build app context for AI
   */
  const buildAppContext = useCallback((): AppContext => {
    const userState = {
      uid: 'demo-user',
      role: 'admin',
      displayName: 'Demo User',
      permissions: ['read', 'write'],
    };

    const safeContext = AppContextProvider.buildContext(
      userState,
      { pathname: location.pathname }
    );

    return {
      userId: safeContext.user.id,
      userRole: safeContext.user.role,
      currentRoute: safeContext.navigation.currentRoute,
      selectedElements: [],
      sessionId: sessionId.current,
      timestamp: Date.now(),
    };
  }, [location.pathname]);

  /**
   * Send a message to the AI assistant
   */
  const sendMessage = useCallback(
    async (content: string) => {
      // Safety check
      const injectionCheck = SafetyFilters.detectPromptInjection(content);
      if (!injectionCheck.safe) {
        setError(new Error(injectionCheck.reason));
        return;
      }

      const sanitized = SafetyFilters.sanitizeInput(content);

      // Capture current messages for this request
      const currentMessages = messages;

      // Add user message
      const userMessage: AssistantMessage = {
        id: `msg-${++messageIdCounter.current}`,
        role: 'user',
        content: sanitized,
        timestamp: Date.now(),
        status: 'complete',
      };

      setMessages((prev) => [...prev, userMessage]);
      setError(null);
      setIsStreaming(true);
      setCurrentStreamingMessage('');
      streamingContentRef.current = '';

      try {
        // Build context and system message
        const appContext = buildAppContext();
        const availableTools = toolRegistry.getToolsForUser(appContext);
        const systemMessage = SystemMessageBuilder.build(
          AppContextProvider.buildContext(
            { uid: appContext.userId, role: appContext.userRole },
            { pathname: appContext.currentRoute }
          ),
          availableTools
        );

        // Convert to Ollama format using captured messages
        const ollamaMessages: OllamaChatMessage[] = [
          { role: 'system', content: systemMessage },
          ...currentMessages.slice(-10).map((msg) => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          })),
          { role: 'user', content: sanitized },
        ];

        // Create assistant message ID
        const assistantMessageId = `msg-${++messageIdCounter.current}`;

        // Convert tools to Ollama format
        const ollamaTools = availableTools.map((tool) => ({
          type: 'function',
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
          },
        }));

        let executedToolCalls: ToolCall[] = [];
        let executedToolResults: ToolResult[] = [];

        // Stream response
        await ollamaService.chatStream({
          messages: ollamaMessages,
          tools: ollamaTools,
          onChunk: (chunk) => {
            streamingContentRef.current += chunk;
            setCurrentStreamingMessage((prev) => prev + chunk);
          },
          onToolCall: async (toolCall) => {
            const result = await toolRegistry.execute(toolCall, appContext);
            executedToolCalls.push(toolCall);
            executedToolResults.push(result);
            return result;
          },
          onComplete: async () => {
            // If tools were called, need to continue conversation
            if (executedToolCalls.length > 0) {
              // Add assistant message with tool calls
              const assistantWithTools: AssistantMessage = {
                id: assistantMessageId,
                role: 'assistant',
                content: streamingContentRef.current || '',
                timestamp: Date.now(),
                status: 'tool-complete',
                toolCalls: executedToolCalls,
                toolResults: executedToolResults,
              };

              setMessages((prev) => [...prev, assistantWithTools]);
              setCurrentStreamingMessage('');
              streamingContentRef.current = '';

              // Continue conversation with tool results
              const followUpMessages: OllamaChatMessage[] = [
                ...ollamaMessages,
                {
                  role: 'assistant',
                  content: '',
                  tool_calls: executedToolCalls,
                },
                ...executedToolResults.map((result) => ({
                  role: 'tool' as const,
                  content: result.content,
                })),
              ];

              // Stream final response
              const finalMessageId = `msg-${++messageIdCounter.current}`;
              await ollamaService.chatStream({
                messages: followUpMessages,
                tools: ollamaTools,
                onChunk: (chunk) => {
                  streamingContentRef.current += chunk;
                  setCurrentStreamingMessage((prev) => prev + chunk);
                },
                onComplete: () => {
                  const finalMessage: AssistantMessage = {
                    id: finalMessageId,
                    role: 'assistant',
                    content: streamingContentRef.current,
                    timestamp: Date.now(),
                    status: 'complete',
                  };

                  setMessages((prev) => [...prev, finalMessage]);
                  setCurrentStreamingMessage('');
                  streamingContentRef.current = '';
                  setIsStreaming(false);
                },
                onError: (err) => {
                  setError(err);
                  setIsStreaming(false);
                },
              });
            } else {
              // No tools called, just complete normally
              const finalMessage: AssistantMessage = {
                id: assistantMessageId,
                role: 'assistant',
                content: streamingContentRef.current,
                timestamp: Date.now(),
                status: 'complete',
              };

              setMessages((prev) => [...prev, finalMessage]);
              setCurrentStreamingMessage('');
              streamingContentRef.current = '';
              setIsStreaming(false);
            }
          },
          onError: (err) => {
            setError(err);
            setIsStreaming(false);
          },
        });

      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setIsStreaming(false);
      }
    },
    [messages, buildAppContext]
  );

  /**
   * Cancel streaming
   */
  const cancelStream = useCallback(() => {
    ollamaService.cancel();
    setIsStreaming(false);
    setCurrentStreamingMessage('');
    streamingContentRef.current = '';
  }, []);

  /**
   * Clear conversation
   */
  const clearConversation = useCallback(() => {
    setMessages([]);
    setCurrentStreamingMessage('');
    streamingContentRef.current = '';
    setError(null);
    localStorage.removeItem('ai_assistant_history');
  }, []);

  /**
   * Display messages including current streaming
   */
  const displayMessages = [...messages];
  if (currentStreamingMessage && isStreaming) {
    displayMessages.push({
      id: 'streaming',
      role: 'assistant',
      content: currentStreamingMessage,
      timestamp: Date.now(),
      status: 'streaming',
    });
  }

  return {
    messages: displayMessages,
    isStreaming,
    error,
    sendMessage,
    cancelStream,
    clearConversation,
  };
}
