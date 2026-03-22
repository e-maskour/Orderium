/**
 * AI Assistant Floating Button
 * Minimized state button that opens the assistant
 */

import React from 'react';
import { Button } from 'primereact/button';
import { MessageSquare } from 'lucide-react';

interface AIAssistantButtonProps {
  onClick: () => void;
}

export const AIAssistantButton: React.FC<AIAssistantButtonProps> = ({ onClick }) => {
  return (
    <div style={{ position: 'fixed', bottom: '1rem', right: '1rem', zIndex: 40 }}>
      <Button
        onClick={onClick}
        rounded
        style={{
          width: '3.5rem',
          height: '3.5rem',
          backgroundColor: '#2563eb',
          border: 'none',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
        }}
        tooltip="AI Assistant (Cmd+K)"
        icon={<MessageSquare style={{ width: '1.5rem', height: '1.5rem' }} />}
      />
      {/* Pulse animation */}
      <span
        className="animate-pulse"
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          backgroundColor: '#2563eb',
          opacity: 0.2,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};
