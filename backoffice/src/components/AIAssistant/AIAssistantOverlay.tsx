/**
 * AI Assistant Overlay
 * Main container for the AI chat assistant
 */

import React, { useState, useEffect } from 'react';
import { Button } from 'primereact/button';
import { X, MessageSquare, Maximize2, Minimize2 } from 'lucide-react';
import { MessageThread } from './MessageThread';
import { InputArea } from './InputArea';
import { useAIAssistant } from '../../hooks/useAIAssistant';
import { PanelState } from '../../types/aiAssistant';

interface AIAssistantOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AIAssistantOverlay: React.FC<AIAssistantOverlayProps> = ({ isOpen, onClose }) => {
  const { messages, isStreaming, error, sendMessage, cancelStream, clearConversation } =
    useAIAssistant();

  const [panelState, setPanelState] = useState<PanelState>('open');
  const [size, setSize] = useState({ width: 400, height: 600 });
  const [isResizing, setIsResizing] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC to close or cancel streaming
      if (e.key === 'Escape') {
        if (isStreaming) {
          cancelStream();
        } else if (isOpen) {
          onClose();
        }
      }

      // Cmd/Ctrl + Shift + C to clear conversation
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'c') {
        clearConversation();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isStreaming, cancelStream, onClose, clearConversation]);

  // Handle resize
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);

    const startX = e.clientX;
    const startWidth = size.width;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = startX - e.clientX;
      const newWidth = Math.max(320, Math.min(800, startWidth + deltaX));
      setSize((prev) => ({ ...prev, width: newWidth }));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  if (!isOpen) return null;

  const toggleExpanded = () => {
    if (panelState === 'expanded') {
      setPanelState('open');
      setSize({ width: 400, height: 600 });
    } else {
      setPanelState('expanded');
      setSize({ width: 700, height: 800 });
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.2)',
          backdropFilter: 'blur(4px)',
          zIndex: 40,
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          bottom: '1rem',
          right: '1rem',
          backgroundColor: '#ffffff',
          borderRadius: '0.5rem',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          border: '1px solid #e5e7eb',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          width: `${size.width}px`,
          height: `${size.height}px`,
          maxHeight: 'calc(100vh - 2rem)',
        }}
      >
        {/* Resize Handle */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '4px',
            cursor: 'ew-resize',
          }}
          onMouseDown={handleResizeStart}
        />

        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem 1rem',
            borderBottom: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MessageSquare style={{ width: '1.25rem', height: '1.25rem', color: '#2563eb' }} />
            <h2 style={{ fontWeight: 600, color: '#111827', margin: 0 }}>AI Assistant</h2>
            {isStreaming && (
              <span className="animate-pulse" style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                Thinking...
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* Expand/Collapse */}
            <Button
              text
              rounded
              onClick={toggleExpanded}
              tooltip={panelState === 'expanded' ? 'Minimize' : 'Expand'}
              icon={
                panelState === 'expanded' ? (
                  <Minimize2 style={{ width: '1rem', height: '1rem' }} />
                ) : (
                  <Maximize2 style={{ width: '1rem', height: '1rem' }} />
                )
              }
              style={{ width: '2rem', height: '2rem', padding: 0 }}
            />

            {/* Close */}
            <Button
              text
              rounded
              onClick={onClose}
              tooltip="Close (ESC)"
              icon={<X style={{ width: '1rem', height: '1rem' }} />}
              style={{ width: '2rem', height: '2rem', padding: 0 }}
            />
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#fef2f2',
              borderBottom: '1px solid #fecaca',
            }}
          >
            <p style={{ fontSize: '0.875rem', color: '#dc2626', margin: 0 }}>
              {error.message || 'An error occurred'}
            </p>
          </div>
        )}

        {/* Messages */}
        <MessageThread messages={messages} isStreaming={isStreaming} />

        {/* Input */}
        <InputArea onSend={sendMessage} disabled={isStreaming} onCancel={cancelStream} />
      </div>
    </>
  );
};
