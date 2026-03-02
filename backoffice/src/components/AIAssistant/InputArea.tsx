/**
 * Input Area
 * Text input and send button for chat
 */

import React, { useState, useRef, KeyboardEvent } from 'react';
import { Button } from 'primereact/button';
import { Send, StopCircle } from 'lucide-react';

interface InputAreaProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  onCancel?: () => void;
}

export const InputArea: React.FC<InputAreaProps> = ({
  onSend,
  disabled = false,
  onCancel,
}) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;

    onSend(trimmed);
    setInput('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd/Ctrl + Enter to send
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }

    // ESC to cancel
    if (e.key === 'Escape' && disabled && onCancel) {
      e.preventDefault();
      onCancel();
    }
  };

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);

    // Auto-grow
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  return (
    <div
      style={{
        borderTop: '1px solid #e5e7eb',
        padding: '1rem',
        backgroundColor: '#f9fafb',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? 'Waiting for response...' : 'Ask me anything...'}
          disabled={disabled}
          style={{
            flex: 1,
            padding: '0.5rem 0.75rem',
            backgroundColor: '#ffffff',
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem',
            resize: 'none',
            outline: 'none',
            minHeight: '40px',
            maxHeight: '120px',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? 'not-allowed' : 'text',
          }}
          rows={1}
        />

        {disabled && onCancel ? (
          <Button
            onClick={onCancel}
            severity="danger"
            label="Stop"
            icon={<StopCircle style={{ width: '1rem', height: '1rem' }} />}
            tooltip="Cancel (ESC)"
            style={{ borderRadius: '0.5rem' }}
          />
        ) : (
          <Button
            onClick={handleSend}
            disabled={disabled || !input.trim()}
            icon={<Send style={{ width: '1rem', height: '1rem' }} />}
            tooltip="Send (Cmd+Enter)"
            style={{ borderRadius: '0.5rem' }}
          />
        )}
      </div>

      <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
        Press{' '}
        <kbd
          style={{
            padding: '0.125rem 0.375rem',
            backgroundColor: '#e5e7eb',
            borderRadius: '0.25rem',
            fontSize: '0.75rem',
          }}
        >
          Cmd+Enter
        </kbd>{' '}
        to send
      </p>
    </div>
  );
};
