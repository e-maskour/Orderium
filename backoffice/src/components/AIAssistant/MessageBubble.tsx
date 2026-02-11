/**
 * Message Bubble
 * Individual message display (user or assistant)
 */

import React from 'react';
import { User, Bot, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { AssistantMessage } from '../../types/aiAssistant';

interface MessageBubbleProps {
  message: AssistantMessage;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  const getStatusIcon = () => {
    switch (message.status) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'tool-pending':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'tool-complete':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'streaming':
        return <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />;
      default:
        return null;
    }
  };

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="max-w-md px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-600 dark:text-gray-400 text-center">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Content */}
      <div className={`flex-1 max-w-[80%] ${isUser ? 'text-right' : ''}`}>
        <div
          className={`inline-block px-4 py-2 rounded-lg ${
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
          }`}
        >
          <p className="whitespace-pre-wrap break-words">{message.content}</p>

          {/* Tool Calls */}
          {message.toolCalls && message.toolCalls.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                🔧 Using tools: {message.toolCalls.map(tc => tc.function.name).join(', ')}
              </p>
            </div>
          )}

          {/* Error */}
          {message.error && (
            <div className="mt-2 pt-2 border-t border-red-200 dark:border-red-800">
              <p className="text-xs text-red-500 dark:text-red-400">
                {message.error}
              </p>
            </div>
          )}
        </div>

        {/* Status & Timestamp */}
        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
          {getStatusIcon()}
          <span>
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>
    </div>
  );
};
