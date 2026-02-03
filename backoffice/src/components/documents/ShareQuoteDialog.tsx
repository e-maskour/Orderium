import { useState } from 'react';
import { X, Share2, Copy, Check, Mail, ExternalLink } from 'lucide-react';

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
  onGenerateLink
}: ShareQuoteDialogProps) {
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  if (!isOpen) return null;

  const shareUrl = shareToken 
    ? `${window.location.origin}/preview/quote/${shareToken}` 
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

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`Devis ${quoteNumber}`);
    const body = encodeURIComponent(
      `Bonjour,\n\nVeuillez trouver le devis ${quoteNumber} via le lien ci-dessous :\n\n${shareUrl}\n\nCordialement`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleOpenPreview = () => {
    window.open(shareUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Share2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">{t('shareQuote')}</h3>
              <p className="text-xs text-slate-500">{quoteNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {!shareToken ? (
            <div className="text-center py-4">
              <Share2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-600 mb-4">
                {t('generateSecureLink')}
              </p>
              <button
                onClick={handleGenerateLink}
                disabled={generating}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
              >
                {generating ? t('generating') : t('generateLink')}
              </button>
            </div>
          ) : (
            <>
              {/* Share Link */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">
                  Lien de partage
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg bg-slate-50 text-slate-700"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    title="Copier"
                  >
                    {copied ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <Copy className="w-5 h-5 text-slate-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expiry Info */}
              {expiresAt && (
                <div className="flex items-center gap-2 text-xs text-slate-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                  <span>
                    Ce lien expire le{' '}
                    {new Date(expiresAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleOpenPreview}
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
                >
                  <ExternalLink className="w-4 h-4" />
                  Aperçu
                </button>
                <button
                  onClick={handleEmailShare}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
                >
                  <Mail className="w-4 h-4" />
                  Email
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
