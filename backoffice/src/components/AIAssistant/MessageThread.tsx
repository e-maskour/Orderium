/**
 * Message Thread
 * Scrollable list of chat messages
 */

import React, { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import { AssistantMessage } from '../../types/aiAssistant';

interface MessageThreadProps {
  messages: AssistantMessage[];
  isStreaming: boolean;
}

export const MessageThread: React.FC<MessageThreadProps> = ({ messages, isStreaming }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  if (messages.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
        }}
      >
        <div style={{ textAlign: 'center', color: '#6b7280' }}>
          <p style={{ fontSize: '1.125rem', fontWeight: 500, marginBottom: '0.5rem' }}>
            Hi! How can I help you today?
          </p>
          <p style={{ fontSize: '0.875rem' }}>
            I can help you with inventory, orders, products, and more.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </div>
  );
};
