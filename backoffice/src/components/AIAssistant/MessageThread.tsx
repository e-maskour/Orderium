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

export const MessageThread: React.FC<MessageThreadProps> = ({
  messages,
  isStreaming,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <p className="text-lg font-medium mb-2">Hi! How can I help you today?</p>
          <p className="text-sm">
            I can help you with inventory, orders, products, and more.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
    >
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </div>
  );
};
