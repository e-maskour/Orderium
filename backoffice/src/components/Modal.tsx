import { ReactNode } from 'react';
import { Dialog } from 'primereact/dialog';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  const sizeWidths: Record<string, string> = {
    sm: '28rem',
    md: '42rem',
    lg: '56rem',
    xl: '72rem',
  };

  return (
    <Dialog
      visible={isOpen}
      onHide={onClose}
      header={title}
      modal
      dismissableMask
      style={{ width: sizeWidths[size], maxWidth: '95vw' }}
      contentStyle={{ maxHeight: '70vh', overflow: 'auto' }}
    >
      {children}
    </Dialog>
  );
}
