import { ReactNode } from 'react';
import { Dialog } from 'primereact/dialog';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ isOpen, onClose, title, children, footer, size = 'md' }: ModalProps) {
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
      footer={footer}
      modal
      dismissableMask
      style={{ width: sizeWidths[size] }}
      breakpoints={{ '960px': '75vw', '640px': '95vw' }}
      contentStyle={{ overflowY: 'auto' }}
    >
      {children}
    </Dialog>
  );
}
