import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

export interface OverlayPanelConfig {
  id: string;
  title?: string;
  content: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  width?: string | number;
  height?: string | number;
  onClose?: () => void;
  onConfirm?: () => void | Promise<void>;
  confirmLabel?: string;
  closeLabel?: string;
  showCloseButton?: boolean;
  showConfirmButton?: boolean;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  className?: string;
  animationDuration?: number;
}

interface OverlayPanelContextType {
  isOpen: boolean;
  config: OverlayPanelConfig | null;
  openPanel: (config: Omit<OverlayPanelConfig, 'id'>) => string;
  closePanel: () => void;
  updatePanel: (config: Partial<OverlayPanelConfig>) => void;
}

const OverlayPanelContext = createContext<OverlayPanelContextType | undefined>(undefined);

export const OverlayPanelProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<OverlayPanelConfig | null>(null);
  const [panelId, setPanelId] = useState(0);

  const openPanel = useCallback((panelConfig: Omit<OverlayPanelConfig, 'id'>) => {
    const id = `overlay-panel-${panelId}`;
    setPanelId((prev) => prev + 1);

    const defaultConfig: OverlayPanelConfig = {
      ...panelConfig,
      id,
      position: panelConfig.position || 'right',
      width: panelConfig.width || 400,
      showCloseButton: panelConfig.showCloseButton !== false,
      showConfirmButton: panelConfig.showConfirmButton !== false,
      closeOnBackdropClick: panelConfig.closeOnBackdropClick !== false,
      closeOnEscape: panelConfig.closeOnEscape !== false,
      animationDuration: panelConfig.animationDuration || 300,
    };

    setConfig(defaultConfig);
    setIsOpen(true);
    return id;
  }, [panelId]);

  const closePanel = useCallback(() => {
    config?.onClose?.();
    setIsOpen(false);
  }, [config]);

  const updatePanel = useCallback((updatedConfig: Partial<OverlayPanelConfig>) => {
    setConfig((prev) => (prev ? { ...prev, ...updatedConfig } : null));
  }, []);

  return (
    <OverlayPanelContext.Provider value={{ isOpen, config, openPanel, closePanel, updatePanel }}>
      {children}
    </OverlayPanelContext.Provider>
  );
};

export const useOverlayPanel = () => {
  const context = useContext(OverlayPanelContext);
  if (!context) {
    throw new Error('useOverlayPanel must be used within OverlayPanelProvider');
  }
  return context;
};
