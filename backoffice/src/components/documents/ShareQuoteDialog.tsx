import { useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Share2, Copy, Check, Mail, ExternalLink } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface ShareQuoteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  quoteNumber: string;
  shareToken: string | null;
  expiresAt: Date | null;
  onGenerateLink: () => Promise<void>;
}

export function ShareQuoteDialog({
  isOpen,
  onClose,
  quoteNumber,
  shareToken,
  expiresAt,
  onGenerateLink,
}: ShareQuoteDialogProps) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const shareUrl = shareToken ? `${window.location.origin}/preview/quote/${shareToken}` : '';

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

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`Devis ${quoteNumber}`);
    const body = encodeURIComponent(
      `Bonjour,\n\nVeuillez trouver le devis ${quoteNumber} via le lien ci-dessous :\n\n${shareUrl}\n\nCordialement`,
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleOpenPreview = () => {
    window.open(shareUrl, '_blank');
  };

  const headerContent = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{ padding: '0.5rem', backgroundColor: '#eff6ff', borderRadius: '0.5rem' }}>
        <Share2 style={{ width: '1.25rem', height: '1.25rem', color: '#2563eb' }} />
      </div>
      <div>
        <div style={{ fontWeight: 600, color: '#0f172a' }}>{t('shareQuote')}</div>
        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{quoteNumber}</div>
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
            <Share2
              style={{ width: '3rem', height: '3rem', color: '#cbd5e1', margin: '0 auto 0.75rem' }}
            />
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
              <label
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: '#334155',
                  marginBottom: '0.5rem',
                }}
              >
                Lien de partage
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <InputText
                  value={shareUrl}
                  readOnly
                  style={{ flex: 1, backgroundColor: '#f8fafc' }}
                />
                <Button
                  text
                  rounded
                  onClick={handleCopyLink}
                  tooltip="Copier"
                  icon={
                    copied ? (
                      <Check style={{ width: '1.25rem', height: '1.25rem', color: '#16a34a' }} />
                    ) : (
                      <Copy style={{ width: '1.25rem', height: '1.25rem', color: '#475569' }} />
                    )
                  }
                  style={{ width: '2.5rem', height: '2.5rem' }}
                />
              </div>
            </div>

            {/* Expiry Info */}
            {expiresAt && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.75rem',
                  color: '#475569',
                  backgroundColor: '#eff6ff',
                  border: '1px solid rgba(35,90,228,0.2)',
                  borderRadius: '0.5rem',
                  padding: '0.75rem',
                }}
              >
                <div
                  style={{
                    width: '0.375rem',
                    height: '0.375rem',
                    borderRadius: '50%',
                    backgroundColor: '#235ae4',
                  }}
                />
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

            {/* Action Buttons */}
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
                icon={<Mail style={{ width: '1rem', height: '1rem' }} />}
                label="Email"
                style={{ flex: 1 }}
              />
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
