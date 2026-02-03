import { useCallback } from 'react';
import { useOverlayPanel, OverlayPanelConfig } from '../context/OverlayPanelContext';

export const useGlobalOverlayPanel = () => {
  const { openPanel, closePanel, updatePanel } = useOverlayPanel();

  const show = useCallback(
    (config: Omit<OverlayPanelConfig, 'id'>) => {
      return openPanel(config);
    },
    [openPanel]
  );

  const close = useCallback(() => {
    closePanel();
  }, [closePanel]);

  const update = useCallback(
    (config: Partial<OverlayPanelConfig>) => {
      updatePanel(config);
    },
    [updatePanel]
  );

  return {
    show,
    close,
    update,
  };
};
