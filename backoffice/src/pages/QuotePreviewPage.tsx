import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FileText, Calendar, User, Phone, MapPin, CreditCard, CheckCircle, XCircle, AlertCircle, PenTool } from 'lucide-react';
import { quotesService } from '../modules/quotes/quotes.service';
import { QuoteWithDetails } from '../modules/quotes/quotes.model';

export default function QuotePreviewPage() {
  const { token } = useParams<{ token: string }>();
  const [quote, setQuote] = useState<QuoteWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [signedBy, setSignedBy] = useState('');
  const [clientNotes, setClientNotes] = useState('');
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    if (token) {
      loadQuote();
    }
  }, [token]);

  const loadQuote = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await quotesService.getByShareToken(token!);
      setQuote(data);
      setSigned(data.quote.status === 'signed');
    } catch (err: any) {
      console.error('Error loading quote:', err);
      setError(err.message || 'Erreur lors du chargement du devis');
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    if (!signedBy.trim()) {
      alert('Veuillez entrer votre nom');
      return;
    }

    try {
      setSigning(true);
      await quotesService.signQuote(token!, signedBy, clientNotes || undefined);
      setSigned(true);
      await loadQuote();
    } catch (err: any) {
      console.error('Error signing quote:', err);
      alert(err.message || 'Erreur lors de la signature du devis');
    } finally {
      setSigning(false);
    }
  };

  const handleReject = async () => {
    if (!confirm('Voulez-vous vraiment refuser ce devis ? Il sera marqué comme fermé.')) {
      return;
    }

    try {
      setRejecting(true);
      // Reject open quote - changes status to 'closed'
      await quotesService.reject(quote!.quote.id);
      await loadQuote();
    } catch (err: any) {
      console.error('Error rejecting quote:', err);
      alert(err.message || 'Erreur lors du refus du devis');
    } finally {
      setRejecting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement du devis...</p>
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Erreur</h2>
          <p className="text-slate-600 mb-6">{error || 'Devis introuvable'}</p>
        </div>
      </div>
    );
  }

  const q = quote.quote;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Devis {q.quoteNumber}</h1>
                <p className="text-sm text-slate-500">
                  {new Date(q.date).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>
            
            {/* Status Badge */}
            <div className={`px-4 py-2 rounded-full ${
              q.status === 'signed'
                ? 'bg-green-50 border border-green-200'
                : q.status === 'closed'
                ? 'bg-red-50 border border-red-200'
                : 'bg-blue-50 border border-blue-200'
            }`}>
              <span className={`text-sm font-semibold ${
                q.status === 'signed'
                  ? 'text-green-700'
                  : q.status === 'closed'
                  ? 'text-red-700'
                  : 'text-blue-700'
              }`}>
                {q.status === 'signed'
                  ? t('signedStatus')
                  : q.status === 'closed'
                  ? t('closedStatus')
                  : t('awaitingSignature')}
              </span>
            </div>
          </div>

          {/* Expiration Date */}
          {q.expirationDate && (
            <div className="flex items-center gap-2 text-sm text-slate-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <Calendar className="w-4 h-4 text-amber-600" />
              <span>
                Valable jusqu'au{' '}
                {new Date(q.expirationDate).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </span>
            </div>
          )}
        </div>

        {/* Customer Info */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Informations Client</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-slate-400 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-900">{q.customerName}</p>
              </div>
            </div>
            {q.customerPhone && (
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-slate-400" />
                <p className="text-slate-700">{q.customerPhone}</p>
              </div>
            )}
            {q.customerAddress && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                <p className="text-slate-700">{q.customerAddress}</p>
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Articles</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Description</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Quantité</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Prix unitaire</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Total</th>
                </tr>
              </thead>
              <tbody>
                {quote.items.map((item, index) => (
                  <tr key={index} className="border-b border-slate-100">
                    <td className="py-3 px-4 text-sm text-slate-900">{item.description}</td>
                    <td className="py-3 px-4 text-sm text-slate-700 text-center">{item.quantity}</td>
                    <td className="py-3 px-4 text-sm text-slate-700 text-right">
                      {item.unitPrice.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH
                    </td>
                    <td className="py-3 px-4 text-sm font-semibold text-slate-900 text-right">
                      {item.total.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Signature Details and Totals Side by Side */}
          <div className="mt-6 border-t border-slate-200 pt-4">
            <div className="flex flex-col md:flex-row gap-6 justify-between">
              {/* Signature Details or Status - Left Side */}
              <div className="flex-1">
                {q.status === 'signed' && q.signedBy && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <h4 className="font-bold text-green-900">Signature</h4>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-green-800">
                        <span className="font-medium">{t('signedByLabel')}</span> {q.signedBy}
                      </p>
                      {q.signedDate && (
                        <p className="text-sm text-green-700">
                          <span className="font-medium">{t('dateLabel')}</span>{' '}
                          {new Date(q.signedDate).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      )}
                      {(q as any).clientNotes && (
                        <div className="mt-2 pt-2 border-t border-green-200">
                          <p className="text-xs text-green-700 font-medium mb-1">Commentaire:</p>
                          <p className="text-sm text-slate-700">{(q as any).clientNotes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {q.status === 'closed' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="w-5 h-5 text-red-600" />
                      <h4 className="font-bold text-red-900">Devis fermé</h4>
                    </div>
                    <p className="text-sm text-red-800">
                      Ce devis a été refusé et ne peut plus être modifié.
                    </p>
                  </div>
                )}
                {q.status !== 'signed' && q.status !== 'closed' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <PenTool className="w-5 h-5 text-blue-600" />
                      <h4 className="font-bold text-blue-900">Détails de signature</h4>
                    </div>
                    <div className="space-y-3">
                      <p className="text-sm text-blue-800">
                        <span className="font-medium">Date:</span>{' '}
                        {new Date().toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1.5">
                          {t('signedByLabel')}
                        </label>
                        <input
                          type="text"
                          value={signedBy}
                          onChange={(e) => setSignedBy(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={t('signedByPlaceholder')}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1.5">
                          Note:
                        </label>
                        <textarea
                          value={clientNotes}
                          onChange={(e) => setClientNotes(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Commentaire (optionnel)"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Totals - Right Side */}
              <div className="space-y-2 w-full md:w-80">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Sous-total HT:</span>
                  <span className="font-semibold text-slate-900">
                    {q.subtotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">TVA:</span>
                  <span className="font-semibold text-slate-900">
                    {q.tax.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH
                  </span>
                </div>
                <div className="flex justify-between text-lg border-t border-slate-200 pt-2">
                  <span className="font-bold text-slate-900">Total TTC:</span>
                  <span className="font-bold text-blue-600">
                    {q.total.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {q.notes && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
            <h3 className="text-lg font-bold text-slate-900 mb-3">Notes</h3>
            <p className="text-slate-700 whitespace-pre-wrap">{q.notes}</p>
          </div>
        )}

        {/* Action Buttons - Show when quote can still be signed or refused */}
        {q.status !== 'signed' && q.status !== 'closed' && q.status !== 'delivered' && q.status !== 'invoiced' && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleSign}
                disabled={signing || !signedBy.trim()}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PenTool className="w-5 h-5" />
                {signing ? 'Signature...' : 'Signer le devis'}
              </button>
              <button
                onClick={handleReject}
                disabled={rejecting || !signedBy.trim()}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <XCircle className="w-5 h-5" />
                {rejecting ? 'Refus...' : 'Refuser le devis'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
