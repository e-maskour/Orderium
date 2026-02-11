/**
 * AI Assistant Floating Button
 * Minimized state button that opens the assistant
 */

import React from 'react';
import { MessageSquare } from 'lucide-react';

interface AIAssistantButtonProps {
  onClick: () => void;
}

export const AIAssistantButton: React.FC<AIAssistantButtonProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-4 right-4 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all z-40 flex items-center justify-center group"
      title="AI Assistant (Cmd+K)"
    >
      <MessageSquare className="w-6 h-6" />
      
      {/* Pulse animation */}
      <span className="absolute inset-0 rounded-full bg-blue-600 animate-ping opacity-20 group-hover:opacity-0" />
    </button>
  );
};
