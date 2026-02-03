import React, { useEffect } from 'react';
import { useOverlayPanel } from '../context/OverlayPanelContext';
import { X, Check } from 'lucide-react';
import './GlobalOverlayPanel.css';

export const GlobalOverlayPanel: React.FC = () => {
  const { isOpen, config, closePanel } = useOverlayPanel();

  useEffect(() => {
    if (config?.closeOnEscape) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && isOpen) {
          closePanel();
        }
      };

      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, config?.closeOnEscape, closePanel]);

  if (!isOpen || !config) return null;

  const getPositionClass = () => {
    const baseClass = 'overlay-panel';
    const positionClass = `overlay-panel--${config.position}`;
    return `${baseClass} ${positionClass}`;
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && config.closeOnBackdropClick) {
      closePanel();
    }
  };

  const handleConfirm = async () => {
    if (config.onConfirm) {
      await config.onConfirm();
    }
    closePanel();
  };

  return (
    <div className="overlay-panel-backdrop" onClick={handleBackdropClick}>
      <div
        className={getPositionClass()}
        style={{
          width: typeof config.width === 'number' ? `${config.width}px` : config.width,
          height: typeof config.height === 'number' ? `${config.height}px` : config.height,
          animationDuration: `${config.animationDuration}ms`,
        }}
      >
        {/* Header */}
        {config.title && (
          <div className="overlay-panel-header">
            <h2 className="overlay-panel-title">{config.title}</h2>
            {config.showCloseButton && (
              <button
                className="overlay-panel-close-button"
                onClick={closePanel}
                aria-label="Close panel"
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="overlay-panel-content">
          {config.content}
        </div>

        {/* Footer with Actions */}
        {(config.showCloseButton || config.showConfirmButton) && (
          <div className="overlay-panel-footer">
            {config.showCloseButton && (
              <button
                className="overlay-panel-button overlay-panel-button--secondary"
                onClick={closePanel}
              >
                {config.closeLabel || 'Close'}
              </button>
            )}
            {config.showConfirmButton && (
              <button
                className="overlay-panel-button overlay-panel-button--primary"
                onClick={handleConfirm}
              >
                <Check size={16} />
                {config.confirmLabel || 'Confirm'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
