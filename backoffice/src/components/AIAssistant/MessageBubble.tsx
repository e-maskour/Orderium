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
        return <AlertCircle style={{ width: '1rem', height: '1rem', color: '#ef4444' }} />;
      case 'tool-pending':
        return (
          <Loader2
            className="animate-spin"
            style={{ width: '1rem', height: '1rem', color: '#3b82f6' }}
          />
        );
      case 'tool-complete':
        return <CheckCircle style={{ width: '1rem', height: '1rem', color: '#22c55e' }} />;
      case 'streaming':
        return (
          <Loader2
            className="animate-spin"
            style={{ width: '1rem', height: '1rem', color: '#9ca3af' }}
          />
        );
      default:
        return null;
    }
  };

  if (isSystem) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div
          style={{
            maxWidth: '28rem',
            padding: '0.5rem 0.75rem',
            backgroundColor: '#f3f4f6',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            color: '#4b5563',
            textAlign: 'center',
          }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '0.75rem', flexDirection: isUser ? 'row-reverse' : 'row' }}>
      {/* Avatar */}
      <div
        style={{
          flexShrink: 0,
          width: '2rem',
          height: '2rem',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isUser ? '#2563eb' : '#e5e7eb',
          color: isUser ? '#ffffff' : '#374151',
        }}
      >
        {isUser ? (
          <User style={{ width: '1rem', height: '1rem' }} />
        ) : (
          <Bot style={{ width: '1rem', height: '1rem' }} />
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, maxWidth: '80%', textAlign: isUser ? 'right' : 'left' }}>
        <div
          style={{
            display: 'inline-block',
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            backgroundColor: isUser ? '#2563eb' : '#f3f4f6',
            color: isUser ? '#ffffff' : '#111827',
          }}
        >
          <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
            {message.content}
          </p>

          {/* Tool Calls */}
          {message.toolCalls && message.toolCalls.length > 0 && (
            <div
              style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #e5e7eb' }}
            >
              <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
                🔧 Using tools: {message.toolCalls.map((tc) => tc.function.name).join(', ')}
              </p>
            </div>
          )}

          {/* Error */}
          {message.error && (
            <div
              style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #fecaca' }}
            >
              <p style={{ fontSize: '0.75rem', color: '#ef4444', margin: 0 }}>{message.error}</p>
            </div>
          )}
        </div>

        {/* Status & Timestamp */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginTop: '0.25rem',
            fontSize: '0.75rem',
            color: '#6b7280',
          }}
        >
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
