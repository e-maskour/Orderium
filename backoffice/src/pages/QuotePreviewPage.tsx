import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  FileText,
  Calendar,
  User,
  Phone,
  MapPin,
  CreditCard,
  CheckCircle,
  XCircle,
  AlertCircle,
  PenTool,
} from 'lucide-react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { InputTextarea } from 'primereact/inputtextarea';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { quotesService } from '../modules/quotes/quotes.service';
import { QuoteWithDetails } from '../modules/quotes/quotes.model';
import { toastError, toastConfirm } from '../services/toast.service';
import { useLanguage } from '../context/LanguageContext';
import { formatAmount } from '@orderium/ui';

export default function QuotePreviewPage() {
  const { t } = useLanguage();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setError(err.message || t('errorLoadingQuote'));
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    if (!signedBy.trim()) {
      toastError(t('enterYourName'));
      return;
    }

    try {
      setSigning(true);
      await quotesService.signQuote(token!, signedBy, clientNotes || undefined);
      setSigned(true);
      await loadQuote();
    } catch (err: any) {
      console.error('Error signing quote:', err);
      toastError(err.message || t('errorSigningQuote'));
    } finally {
      setSigning(false);
    }
  };

  const handleReject = () => {
    toastConfirm(
      t('confirmRejectQuoteMessage'),
      async () => {
        try {
          setRejecting(true);
          await quotesService.reject(quote!.quote.id);
          await loadQuote();
        } catch (err: any) {
          console.error('Error rejecting quote:', err);
          toastError(err.message || t('errorRejectingQuote'));
        } finally {
          setRejecting(false);
        }
      },
      { confirmLabel: t('rejectLabel') },
    );
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            className="animate-spin"
            style={{
              borderRadius: '9999px',
              height: '3rem',
              width: '3rem',
              borderBottom: '2px solid #2563eb',
              margin: '0 auto 1rem',
            }}
          ></div>
          <p style={{ color: '#475569' }}>Chargement du devis...</p>
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}
      >
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '0.5rem',
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
            padding: '2rem',
            maxWidth: '28rem',
            width: '100%',
            textAlign: 'center',
          }}
        >
          <AlertCircle
            style={{ width: '4rem', height: '4rem', color: '#ef4444', margin: '0 auto 1rem' }}
          />
          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#0f172a',
              marginBottom: '0.5rem',
            }}
          >
            Erreur
          </h2>
          <p style={{ color: '#475569', marginBottom: '1.5rem' }}>{error || 'Devis introuvable'}</p>
        </div>
      </div>
    );
  }

  const q = quote.quote;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '56rem', margin: '0 auto' }}>
        {/* Header */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            border: '1px solid #e2e8f0',
            padding: '1.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{ padding: '0.75rem', backgroundColor: '#eff6ff', borderRadius: '0.5rem' }}
              >
                <FileText style={{ width: '1.5rem', height: '1.5rem', color: '#2563eb' }} />
              </div>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Devis {q.quoteNumber}
                </h1>
                <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
                  {new Date(q.date).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>

            {/* Status Badge */}
            <div
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '9999px',
                backgroundColor:
                  q.status === 'signed' ? '#f0fdf4' : q.status === 'closed' ? '#fef2f2' : '#eff6ff',
                border: `1px solid ${q.status === 'signed' ? '#bbf7d0' : q.status === 'closed' ? '#fecaca' : '#bfdbfe'}`,
              }}
            >
              <span
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color:
                    q.status === 'signed'
                      ? '#15803d'
                      : q.status === 'closed'
                        ? '#b91c1c'
                        : '#1d4ed8',
                }}
              >
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
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                color: '#475569',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '0.5rem',
                padding: '0.75rem',
              }}
            >
              <Calendar style={{ width: '1rem', height: '1rem', color: '#235ae4' }} />
              <span>
                Valable jusqu'au{' '}
                {new Date(q.expirationDate).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
          )}
        </div>

        {/* Customer Info */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            border: '1px solid #e2e8f0',
            padding: '1.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <h3
            style={{
              fontSize: '1.125rem',
              fontWeight: 700,
              color: '#0f172a',
              marginBottom: '1rem',
            }}
          >
            Informations Client
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <User
                style={{
                  width: '1.25rem',
                  height: '1.25rem',
                  color: '#94a3b8',
                  marginTop: '0.125rem',
                }}
              />
              <div>
                <p style={{ fontWeight: 600, color: '#0f172a', margin: 0 }}>{q.customerName}</p>
              </div>
            </div>
            {q.customerPhone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Phone style={{ width: '1.25rem', height: '1.25rem', color: '#94a3b8' }} />
                <p style={{ color: '#334155', margin: 0 }}>{q.customerPhone}</p>
              </div>
            )}
            {q.customerAddress && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <MapPin
                  style={{
                    width: '1.25rem',
                    height: '1.25rem',
                    color: '#94a3b8',
                    marginTop: '0.125rem',
                  }}
                />
                <p style={{ color: '#334155', margin: 0 }}>{q.customerAddress}</p>
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            border: '1px solid #e2e8f0',
            padding: '1.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <h3
            style={{
              fontSize: '1.125rem',
              fontWeight: 700,
              color: '#0f172a',
              marginBottom: '1rem',
            }}
          >
            Articles
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <DataTable value={quote.items} size="small" tableStyle={{ width: '100%' }}>
              <Column
                field="description"
                header="Description"
                headerStyle={{
                  textAlign: 'left',
                  padding: '0.75rem 1rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#334155',
                  background: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                }}
                bodyStyle={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#0f172a' }}
              />
              <Column
                field="quantity"
                header="Quantité"
                headerStyle={{
                  textAlign: 'center',
                  padding: '0.75rem 1rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#334155',
                  background: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                }}
                bodyStyle={{
                  textAlign: 'center',
                  padding: '0.75rem 1rem',
                  fontSize: '0.875rem',
                  color: '#334155',
                }}
              />
              <Column
                field="unitPrice"
                header="Prix unitaire"
                headerStyle={{
                  textAlign: 'right',
                  padding: '0.75rem 1rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#334155',
                  background: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                }}
                bodyStyle={{
                  textAlign: 'right',
                  padding: '0.75rem 1rem',
                  fontSize: '0.875rem',
                  color: '#334155',
                }}
                body={(item: any) => `${formatAmount(item.unitPrice, 2)} ${t('currency')}`}
              />
              <Column
                field="total"
                header="Total"
                headerStyle={{
                  textAlign: 'right',
                  padding: '0.75rem 1rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#334155',
                  background: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                }}
                bodyStyle={{
                  textAlign: 'right',
                  padding: '0.75rem 1rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#0f172a',
                }}
                body={(item: any) => `${formatAmount(item.total, 2)} ${t('currency')}`}
              />
            </DataTable>
          </div>

          {/* Signature Details and Totals Side by Side */}
          <div style={{ marginTop: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
                justifyContent: 'space-between',
              }}
            >
              {/* Signature Details or Status - Left Side */}
              <div style={{ flex: 1 }}>
                {q.status === 'signed' && q.signedBy && (
                  <div
                    style={{
                      backgroundColor: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '0.5rem',
                      padding: '1rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '0.5rem',
                      }}
                    >
                      <CheckCircle
                        style={{ width: '1.25rem', height: '1.25rem', color: '#16a34a' }}
                      />
                      <h4 style={{ fontWeight: 700, color: '#14532d', margin: 0 }}>Signature</h4>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <p style={{ fontSize: '0.875rem', color: '#166534', margin: 0 }}>
                        <span style={{ fontWeight: 500 }}>{t('signedByLabel')}</span> {q.signedBy}
                      </p>
                      {q.signedDate && (
                        <p style={{ fontSize: '0.875rem', color: '#15803d', margin: 0 }}>
                          <span style={{ fontWeight: 500 }}>{t('dateLabel')}</span>{' '}
                          {new Date(q.signedDate).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      )}
                      {(q as any).clientNotes && (
                        <div
                          style={{
                            marginTop: '0.5rem',
                            paddingTop: '0.5rem',
                            borderTop: '1px solid #bbf7d0',
                          }}
                        >
                          <p
                            style={{
                              fontSize: '0.75rem',
                              color: '#15803d',
                              fontWeight: 500,
                              marginBottom: '0.25rem',
                            }}
                          >
                            Commentaire:
                          </p>
                          <p style={{ fontSize: '0.875rem', color: '#334155', margin: 0 }}>
                            {(q as any).clientNotes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {q.status === 'closed' && (
                  <div
                    style={{
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '0.5rem',
                      padding: '1rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '0.5rem',
                      }}
                    >
                      <XCircle style={{ width: '1.25rem', height: '1.25rem', color: '#dc2626' }} />
                      <h4 style={{ fontWeight: 700, color: '#991b1b', margin: 0 }}>Devis fermé</h4>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: '#991b1b', margin: 0 }}>
                      Ce devis a été refusé et ne peut plus être modifié.
                    </p>
                  </div>
                )}
                {q.status !== 'signed' && q.status !== 'closed' && (
                  <div
                    style={{
                      backgroundColor: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '0.5rem',
                      padding: '1rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '0.75rem',
                      }}
                    >
                      <PenTool style={{ width: '1.25rem', height: '1.25rem', color: '#2563eb' }} />
                      <h4 style={{ fontWeight: 700, color: '#1e3a5a', margin: 0 }}>
                        Détails de signature
                      </h4>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <p style={{ fontSize: '0.875rem', color: '#1e40af', margin: 0 }}>
                        <span style={{ fontWeight: 500 }}>Date:</span>{' '}
                        {new Date().toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                      <div>
                        <div>
                          <label
                            style={{
                              display: 'block',
                              fontSize: '0.875rem',
                              fontWeight: 500,
                              color: '#334155',
                              marginBottom: '0.25rem',
                            }}
                          >
                            {t('signedByLabel')}
                          </label>
                          <InputText
                            type="text"
                            value={signedBy}
                            onChange={(e) => setSignedBy(e.target.value)}
                            placeholder={t('signedByPlaceholder')}
                            style={{ width: '100%' }}
                          />
                        </div>
                      </div>
                      <div>
                        <div>
                          <label
                            style={{
                              display: 'block',
                              fontSize: '0.875rem',
                              fontWeight: 500,
                              color: '#334155',
                              marginBottom: '0.25rem',
                            }}
                          >
                            Note:
                          </label>
                          <InputTextarea
                            value={clientNotes}
                            onChange={(e) => setClientNotes(e.target.value)}
                            rows={3}
                            placeholder="Commentaire (optionnel)"
                            style={{ width: '100%' }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Totals - Right Side */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  width: '100%',
                  maxWidth: '20rem',
                  marginLeft: 'auto',
                }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}
                >
                  <span style={{ color: '#475569' }}>Sous-total HT:</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>
                    {formatAmount(q.subtotal, 2)} {t('currency')}
                  </span>
                </div>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}
                >
                  <span style={{ color: '#475569' }}>TVA:</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>
                    {formatAmount(q.tax, 2)} {t('currency')}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '1.125rem',
                    borderTop: '1px solid #e2e8f0',
                    paddingTop: '0.5rem',
                  }}
                >
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>Total TTC:</span>
                  <span style={{ fontWeight: 700, color: '#2563eb' }}>
                    {formatAmount(q.total, 2)} {t('currency')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {q.notes && (
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '0.5rem',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              border: '1px solid #e2e8f0',
              padding: '1.5rem',
              marginBottom: '1.5rem',
            }}
          >
            <h3
              style={{
                fontSize: '1.125rem',
                fontWeight: 700,
                color: '#0f172a',
                marginBottom: '0.75rem',
              }}
            >
              Notes
            </h3>
            <p style={{ color: '#334155', whiteSpace: 'pre-wrap', margin: 0 }}>{q.notes}</p>
          </div>
        )}

        {/* Action Buttons */}
        {q.status !== 'signed' &&
          q.status !== 'closed' &&
          q.status !== 'delivered' &&
          q.status !== 'invoiced' && (
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '0.5rem',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                border: '1px solid #e2e8f0',
                padding: '1.5rem',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <Button
                  label={signing ? 'Signature...' : 'Signer le devis'}
                  icon={<PenTool style={{ width: '1rem', height: '1rem' }} />}
                  onClick={handleSign}
                  disabled={signing || !signedBy.trim()}
                  loading={signing}
                  style={{ flex: 1 }}
                />
                <Button
                  label={rejecting ? 'Refus...' : 'Refuser le devis'}
                  icon={<XCircle style={{ width: '1rem', height: '1rem' }} />}
                  onClick={handleReject}
                  disabled={rejecting || !signedBy.trim()}
                  severity="danger"
                  loading={rejecting}
                  style={{ flex: 1 }}
                />
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
