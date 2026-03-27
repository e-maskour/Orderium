import { useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Share2, Copy, Check, Mail, ExternalLink, MessageCircle, Trash2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export type ShareDocumentType = 'devis' | 'facture' | 'bon_livraison';

const DOCUMENT_LABELS: Record<ShareDocumentType, { title: string; fr: string; previewPath: string }> = {
  devis: { title: 'Partager le devis', fr: 'Devis', previewPath: 'quote' },
  facture: { title: 'Partager la facture', fr: 'Facture', previewPath: 'invoice' },
  bon_livraison: { title: 'Partager le bon', fr: 'Bon de livraison', previewPath: 'order' },
};

interface ShareDocumentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: ShareDocumentType;
  documentNumber: string;
  partnerName?: string;
  partnerPhone?: string;
  totalAmount?: number;
  shareToken: string | null;
  expiresAt: Date | null;
  onGenerateLink: () => Promise<void>;
  onRevokeLink?: () => Promise<void>;
}

export function ShareDocumentDialog({
  isOpen,
  onClose,
  documentType,
  documentNumber,
  partnerName,
  partnerPhone,
  totalAmount,
  shareToken,
  expiresAt,
  onGenerateLink,
  onRevokeLink,
}: ShareDocumentDialogProps) {
  const { t, language } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const docInfo = DOCUMENT_LABELS[documentType];

  const shareUrl = shareToken
    ? `${window.location.origin}/preview/${docInfo.previewPath}/${shareToken}`
    : '';

  const handleCopyLink = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGenerateLink = async () => {
    setGenerating(true);
    try {
      await onGenerateLink();
    } finally {
      setGenerating(false);
    }
  };

  const handleRevokeLink = async () => {
    if (!onRevokeLink) return;
    setRevoking(true);
    try {
      await onRevokeLink();
    } finally {
      setRevoking(false);
    }
  };

  const handleWhatsApp = () => {
    const phone = partnerPhone?.replace(/\D/g, '') || '';
    const currency = language === 'ar' ? 'د.م' : 'DH';
    const total = totalAmount != null ? `${totalAmount.toFixed(2)} ${currency}` : '';
    const totalLine = total ? `Montant : *${total}*\n` : '';
    const greeting = partnerName ? `Bonjour *${partnerName}*,\n\n` : 'Bonjour,\n\n';
    const message = `${greeting}Veuillez trouver votre *${docInfo.fr} ${documentNumber}* via le lien ci-dessous :\n\n${shareUrl}\n\n${totalLine}\nCordialement`;
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`${docInfo.fr} ${documentNumber}`);
    const body = encodeURIComponent(
      `Bonjour,\n\nVeuillez trouver le ${docInfo.fr.toLowerCase()} ${documentNumber} via le lien ci-dessous :\n\n${shareUrl}\n\nCordialement`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleOpenPreview = () => {
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  const headerContent = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{ padding: '0.5rem', backgroundColor: '#eff6ff', borderRadius: '0.5rem' }}>
        <Share2 style={{ width: '1.25rem', height: '1.25rem', color: '#2563eb' }} />
      </div>
      <div>
        <div style={{ fontWeight: 600, color: '#0f172a' }}>{docInfo.title}</div>
        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{documentNumber}</div>
      </div>
    </div>
  );

  const footerContent = (
    <div className="flex justify-content-end">
      <Button
        onClick={onClose}
        label={t('close')}
        outlined
        style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
      />
    </div>
  );

  return (
    <Dialog
      visible={isOpen}
      onHide={onClose}
      header={headerContent}
      footer={footerContent}
      modal
      dismissableMask
      style={{ width: '28rem' }}
      breakpoints={{ '640px': '95vw' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {!shareToken ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <Share2 style={{ width: '3rem', height: '3rem', color: '#cbd5e1', margin: '0 auto 0.75rem' }} />
            <p style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '1rem' }}>
              {t('generateSecureLink')}
            </p>
            <Button
              onClick={handleGenerateLink}
              loading={generating}
              label={generating ? t('generating') : t('generateLink')}
            />
          </div>
        ) : (
          <>
            {/* Share Link */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#334155', marginBottom: '0.5rem' }}>
                Lien de partage
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <InputText
                  value={shareUrl}
                  readOnly
                  style={{ flex: 1, backgroundColor: '#f8fafc', fontSize: '0.8125rem' }}
                />
                <Button
                  text
                  rounded
                  onClick={handleCopyLink}
                  tooltip="Copier"
                  icon={copied
                    ? <Check style={{ width: '1.25rem', height: '1.25rem', color: '#16a34a' }} />
                    : <Copy style={{ width: '1.25rem', height: '1.25rem', color: '#475569' }} />
                  }
                  style={{ width: '2.5rem', height: '2.5rem' }}
                />
              </div>
            </div>

            {/* Expiry Info */}
            {expiresAt && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.75rem',
                color: '#475569',
                backgroundColor: '#eff6ff',
                border: '1px solid rgba(35,90,228,0.2)',
                borderRadius: '0.5rem',
                padding: '0.75rem',
              }}>
                <div style={{ width: '0.375rem', height: '0.375rem', borderRadius: '50%', backgroundColor: '#235ae4', flexShrink: 0 }} />
                <span>
                  Ce lien expire le{' '}
                  {new Date(expiresAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
            )}

            {/* WhatsApp Button */}
            <Button
              onClick={handleWhatsApp}
              icon={<MessageCircle style={{ width: '1rem', height: '1rem' }} />}
              label="Envoyer par WhatsApp"
              style={{
                background: '#25D366',
                border: 'none',
                color: '#fff',
                fontWeight: 600,
                justifyContent: 'center',
              }}
            />

            {/* Other Action Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button
                onClick={handleOpenPreview}
                outlined
                icon={<ExternalLink style={{ width: '1rem', height: '1rem' }} />}
                label="Aperçu"
                style={{ flex: 1 }}
              />
              <Button
                onClick={handleEmailShare}
                outlined
                icon={<Mail style={{ width: '1rem', height: '1rem' }} />}
                label="Email"
                style={{ flex: 1 }}
              />
            </div>

            {/* Revoke Link */}
            {onRevokeLink && (
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
                <Button
                  onClick={handleRevokeLink}
                  loading={revoking}
                  icon={<Trash2 style={{ width: '0.875rem', height: '0.875rem' }} />}
                  label="Révoquer le lien"
                  text
                  severity="danger"
                  style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem' }}
                />
              </div>
            )}
          </>
        )}
      </div>
    </Dialog>
  );
}
