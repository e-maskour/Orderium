/**
 * AI Assistant Overlay
 * Main container for the AI chat assistant
 */

import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Maximize2, Minimize2 } from 'lucide-react';
import { MessageThread } from './MessageThread';
import { InputArea } from './InputArea';
import { useAIAssistant } from '../../hooks/useAIAssistant';
import { PanelState } from '../../types/aiAssistant';

interface AIAssistantOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AIAssistantOverlay: React.FC<AIAssistantOverlayProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    messages,
    isStreaming,
    error,
    sendMessage,
    cancelStream,
    clearConversation,
  } = useAIAssistant();

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
      setSize(prev => ({ ...prev, width: newWidth }));
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
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed bottom-4 right-4 bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-50 flex flex-col overflow-hidden"
        style={{
          width: `${size.width}px`,
          height: `${size.height}px`,
          maxHeight: 'calc(100vh - 2rem)',
        }}
      >
        {/* Resize Handle */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-blue-500/50"
          onMouseDown={handleResizeStart}
        />

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">
              AI Assistant
            </h2>
            {isStreaming && (
              <span className="text-xs text-gray-500 dark:text-gray-400 animate-pulse">
                Thinking...
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Expand/Collapse */}
            <button
              onClick={toggleExpanded}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              title={panelState === 'expanded' ? 'Minimize' : 'Expand'}
            >
              {panelState === 'expanded' ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              title="Close (ESC)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">
              {error.message || 'An error occurred'}
            </p>
          </div>
        )}

        {/* Messages */}
        <MessageThread messages={messages} isStreaming={isStreaming} />

        {/* Input */}
        <InputArea
          onSend={sendMessage}
          disabled={isStreaming}
          onCancel={cancelStream}
        />
      </div>
    </>
  );
};
