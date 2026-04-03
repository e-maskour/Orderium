import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Printer,
  PlayCircle,
  Wifi,
  Usb,
  Globe,
  Monitor,
  CheckCircle,
  XCircle,
  Clock,
  Info,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../../components/AdminLayout';
import { PageHeader } from '../../components/PageHeader';
import { Modal } from '../../components/Modal';
import { Button } from 'primereact/button';
import { useLanguage } from '../../context/LanguageContext';
import { toastError, toastConfirm } from '../../services/toast.service';
import {
  printersService,
  type IPrinter,
  type CreatePrinterDTO,
  type UpdatePrinterDTO,
} from '../../modules/printers';
import {
  printReceipt,
  detectPlatform,
  type PrinterConfig,
  type ReceiptData,
} from '@shared-print/PrintManager';

const BRAND_OPTIONS = [
  { value: 'epson', label: 'Epson' },
  { value: 'star', label: 'Star Micronics' },
  { value: 'generic', label: 'Générique' },
  { value: 'qztray', label: 'QZ Tray' },
  { value: 'browser', label: 'Navigateur' },
];

const CONNECTION_OPTIONS = [
  { value: 'wifi', label: 'WiFi', icon: Wifi },
  { value: 'usb', label: 'USB', icon: Usb },
  { value: 'network', label: 'Réseau', icon: Globe },
  { value: 'browser', label: 'Navigateur', icon: Monitor },
];

const PAPER_WIDTHS = [
  { value: 58, label: '58mm (ticket)' },
  { value: 80, label: '80mm (ticket)' },
  { value: 210, label: '210mm (A4)' },
];

const DOC_TYPE_OPTIONS = [
  { value: 'receipt', label: 'Ticket de caisse' },
  { value: 'bl', label: 'Bon de livraison' },
  { value: 'devis', label: 'Devis' },
  { value: 'bon_commande', label: 'Bon de commande' },
  { value: 'pos', label: 'POS' },
  { value: 'stock', label: 'Stock' },
];

const DUMMY_RECEIPT: ReceiptData = {
  storeName: 'Morocom — Test',
  storePhone: '0600000000',
  orderNumber: 'TEST-001',
  date: new Date().toLocaleString('fr-FR'),
  clientName: 'Client Test',
  items: [
    { name: 'Produit A', qty: 2, unitPrice: 49.9, total: 99.8 },
    { name: 'Produit B', qty: 1, unitPrice: 150.0, total: 150.0 },
  ],
  subtotal: 249.8,
  total: 249.8,
  footer: "Ceci est un test d'impression",
};

function PrinterForm({
  printer,
  onSubmit,
  isLoading,
}: {
  printer?: IPrinter;
  onSubmit: (data: CreatePrinterDTO) => void;
  isLoading: boolean;
}) {
  const { t } = useLanguage();
  const [form, setForm] = useState<CreatePrinterDTO>({
    name: printer?.name ?? '',
    brand: (printer?.brand as CreatePrinterDTO['brand']) ?? 'epson',
    connectionType: (printer?.connectionType as CreatePrinterDTO['connectionType']) ?? 'wifi',
    model: printer?.model ?? undefined,
    ip: printer?.ip ?? undefined,
    port: printer?.port ?? 8008,
    paperWidth: (printer?.paperWidth as CreatePrinterDTO['paperWidth']) ?? 80,
    isDefault: printer?.isDefault ?? false,
    documentTypes: printer?.documentTypes ?? ['receipt'],
  });

  const showIpField = ['wifi', 'network'].includes(form.connectionType);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
      style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
    >
      <div>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>
          {t('printerName')}
        </label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
          maxLength={60}
          style={inputStyle}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>
            {t('printerBrand')}
          </label>
          <select
            value={form.brand}
            onChange={(e) =>
              setForm({ ...form, brand: e.target.value as CreatePrinterDTO['brand'] })
            }
            style={inputStyle}
          >
            {BRAND_OPTIONS.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>
            {t('connectionType')}
          </label>
          <select
            value={form.connectionType}
            onChange={(e) =>
              setForm({
                ...form,
                connectionType: e.target.value as CreatePrinterDTO['connectionType'],
              })
            }
            style={inputStyle}
          >
            {CONNECTION_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {showIpField && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>
              {t('ipAddress')}
            </label>
            <input
              type="text"
              value={form.ip ?? ''}
              onChange={(e) => setForm({ ...form, ip: e.target.value })}
              placeholder="192.168.1.100"
              required
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>
              {t('printerPort')}
            </label>
            <input
              type="number"
              value={form.port ?? 8008}
              onChange={(e) => setForm({ ...form, port: parseInt(e.target.value) })}
              min={1}
              max={65535}
              style={inputStyle}
            />
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>
            {t('printerModel')}
          </label>
          <input
            type="text"
            value={form.model ?? ''}
            onChange={(e) => setForm({ ...form, model: e.target.value || undefined })}
            placeholder="TM-T20III"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>
            {t('paperWidth')}
          </label>
          <select
            value={form.paperWidth}
            onChange={(e) =>
              setForm({
                ...form,
                paperWidth: parseInt(e.target.value) as CreatePrinterDTO['paperWidth'],
              })
            }
            style={inputStyle}
          >
            {PAPER_WIDTHS.map((w) => (
              <option key={w.value} value={w.value}>
                {w.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>
          {t('documentTypes')}
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {DOC_TYPE_OPTIONS.map((dt) => (
            <label
              key={dt.value}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '0.25rem 0.75rem',
                borderRadius: '0.375rem',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                background: form.documentTypes.includes(dt.value)
                  ? 'var(--primary-50, #eef1fd)'
                  : '#fff',
              }}
            >
              <input
                type="checkbox"
                checked={form.documentTypes.includes(dt.value)}
                onChange={(e) => {
                  const types = e.target.checked
                    ? [...form.documentTypes, dt.value]
                    : form.documentTypes.filter((t) => t !== dt.value);
                  setForm({ ...form, documentTypes: types });
                }}
              />
              {dt.label}
            </label>
          ))}
        </div>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="checkbox"
          checked={form.isDefault ?? false}
          onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
        />
        <span style={{ fontWeight: 600 }}>{t('isDefaultPrinter')}</span>
      </label>

      <button
        type="submit"
        disabled={isLoading || !form.name || form.documentTypes.length === 0}
        style={{
          ...btnPrimary,
          opacity: isLoading ? 0.6 : 1,
        }}
      >
        {isLoading ? 'Enregistrement...' : printer ? t('editPrinter') : t('addPrinter')}
      </button>
    </form>
  );
}

export default function Printers() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const platform = detectPlatform();

  const [showModal, setShowModal] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<IPrinter | null>(null);
  const [activeTab, setActiveTab] = useState<'printers' | 'history'>('printers');
  const [jobsPage, setJobsPage] = useState(1);

  const { data: printers = [], isLoading } = useQuery({
    queryKey: ['printers'],
    queryFn: () => printersService.getPrinters(),
  });

  const { data: jobsResponse } = useQuery({
    queryKey: ['print-jobs', jobsPage],
    queryFn: () => printersService.getPrintJobs({ page: jobsPage, limit: 20 }),
    enabled: activeTab === 'history',
  });

  const createMutation = useMutation({
    mutationFn: (data: CreatePrinterDTO) => printersService.createPrinter(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printers'] });
      setShowModal(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePrinterDTO }) =>
      printersService.updatePrinter(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printers'] });
      setShowModal(false);
      setEditingPrinter(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => printersService.deletePrinter(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printers'] });
    },
  });

  const handleTestPrint = async (printer: IPrinter) => {
    const config: PrinterConfig = {
      id: printer.id,
      brand: printer.brand as PrinterConfig['brand'],
      ip: printer.ip ?? undefined,
      port: printer.port,
      paperWidth: printer.paperWidth,
    };
    const result = await printReceipt(config, DUMMY_RECEIPT);

    printersService
      .logPrintJob({
        printerId: printer.id,
        documentType: 'receipt',
        method: result.method,
        status: result.status,
        durationMs: result.durationMs,
      })
      .catch(() => {});

    if (printer.id) {
      printersService.pingPrinter(printer.id).catch(() => {});
    }
  };

  const handleDelete = (printer: IPrinter) => {
    toastConfirm(
      t('deletePrinterConfirm') || 'Supprimer cette imprimante ?',
      () => deleteMutation.mutate(printer.id),
      { variant: 'destructive', confirmLabel: t('delete') || 'Supprimer' },
    );
  };

  const openEdit = (printer: IPrinter) => {
    setEditingPrinter(printer);
    setShowModal(true);
  };

  const openCreate = () => {
    setEditingPrinter(null);
    setShowModal(true);
  };

  const jobs = jobsResponse?.data ?? [];
  const jobsMeta = jobsResponse?.metadata ?? {
    total: 0,
    limit: 20,
    offset: 0,
    hasNext: false,
    hasPrev: false,
  };

  return (
    <AdminLayout>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <PageHeader
          icon={Printer}
          title={t('printers')}
          subtitle={t('printersDescription')}
          backButton={
            <Button
              icon={<ArrowLeft style={{ width: '1rem', height: '1rem' }} />}
              onClick={() => navigate('/configurations')}
              style={{
                width: '2.25rem',
                height: '2.25rem',
                flexShrink: 0,
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                color: '#64748b',
                borderRadius: '0.625rem',
                padding: 0,
              }}
            />
          }
          actions={
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={openCreate} style={btnPrimary}>
                <Plus style={{ width: 16, height: 16 }} />
                {t('addPrinter')}
              </button>
            </div>
          }
        />

        {/* Platform detection banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            background: '#f0f4f8',
            borderRadius: '0.75rem',
            marginBottom: '1.5rem',
            border: '1px solid #e2e8f0',
          }}
        >
          <Info style={{ width: 20, height: 20, color: '#64748b', flexShrink: 0 }} />
          <div style={{ fontSize: '0.875rem', color: '#475569' }}>
            <strong>{t('platformDetection')}:</strong> {platform.os.toUpperCase()}
            {platform.isMobile ? ' (mobile)' : ' (desktop)'}
            {platform.hasQzTray && ' — QZ Tray détecté ✓'}
            {' · '}
            <strong>{t('recommendedSetup')}:</strong>{' '}
            {platform.os === 'ios'
              ? 'AirPrint (navigateur)'
              : platform.os === 'android'
                ? 'Mopria (navigateur)'
                : platform.hasQzTray
                  ? 'QZ Tray (USB/réseau)'
                  : 'Epson ePOS ou Star WebPRNT (WiFi)'}
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '0.25rem',
            borderBottom: '2px solid #e2e8f0',
            marginBottom: '1.5rem',
          }}
        >
          {(['printers', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '0.5rem 1.25rem',
                fontWeight: 600,
                fontSize: '0.875rem',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                borderBottom:
                  activeTab === tab
                    ? '2px solid var(--primary-color, #235ae4)'
                    : '2px solid transparent',
                color: activeTab === tab ? 'var(--primary-color, #235ae4)' : '#64748b',
                marginBottom: -2,
              }}
            >
              {tab === 'printers' ? t('printers') : t('printHistory')}
            </button>
          ))}
        </div>

        {activeTab === 'printers' && (
          <>
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                <i className="pi pi-spin pi-spinner" style={{ fontSize: '2rem' }} />
              </div>
            ) : printers.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '3rem',
                  background: '#fff',
                  borderRadius: '0.75rem',
                  border: '1px solid #e2e8f0',
                }}
              >
                <Printer
                  style={{ width: 48, height: 48, color: '#cbd5e1', margin: '0 auto 1rem' }}
                />
                <p style={{ color: '#64748b' }}>{t('noprinters')}</p>
                <button onClick={openCreate} style={{ ...btnPrimary, marginTop: '0.75rem' }}>
                  <Plus style={{ width: 16, height: 16 }} />
                  {t('addPrinter')}
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {printers.map((printer) => (
                  <div
                    key={printer.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '1rem 1.25rem',
                      background: '#fff',
                      borderRadius: '0.75rem',
                      border: `1.5px solid ${printer.isDefault ? 'var(--primary-color, #235ae4)' : '#e2e8f0'}`,
                      boxShadow: '0 1px 3px rgba(15,23,42,0.05)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: '0.625rem',
                          background: printer.isDefault
                            ? 'var(--primary-color, #235ae4)'
                            : '#f1f5f9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Printer
                          style={{
                            width: 20,
                            height: 20,
                            color: printer.isDefault ? '#fff' : '#64748b',
                          }}
                        />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: '#1e293b' }}>
                          {printer.name}
                          {printer.isDefault && (
                            <span
                              style={{
                                marginLeft: 8,
                                fontSize: '0.7rem',
                                background: 'var(--primary-50, #eef1fd)',
                                color: 'var(--primary-color, #235ae4)',
                                padding: '2px 8px',
                                borderRadius: 12,
                                fontWeight: 600,
                              }}
                            >
                              Par défaut
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                          {BRAND_OPTIONS.find((b) => b.value === printer.brand)?.label} ·{' '}
                          {printer.model ?? printer.brand} ·{' '}
                          {
                            CONNECTION_OPTIONS.find((c) => c.value === printer.connectionType)
                              ?.label
                          }{' '}
                          · {printer.paperWidth}mm
                          {printer.ip && ` · ${printer.ip}:${printer.port}`}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2 }}>
                          {printer.documentTypes.join(', ')}
                          {printer.lastSeenAt && (
                            <span style={{ marginLeft: 8 }}>
                              · Vu {new Date(printer.lastSeenAt).toLocaleDateString('fr-FR')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleTestPrint(printer)}
                        style={btnIcon}
                        title={t('testPrint')}
                      >
                        <PlayCircle style={{ width: 18, height: 18, color: '#22c55e' }} />
                      </button>
                      <button
                        onClick={() => openEdit(printer)}
                        style={btnIcon}
                        title={t('editPrinter')}
                      >
                        <Pencil style={{ width: 16, height: 16, color: '#64748b' }} />
                      </button>
                      <button
                        onClick={() => handleDelete(printer)}
                        style={btnIcon}
                        title="Supprimer"
                      >
                        <Trash2 style={{ width: 16, height: 16, color: '#ef4444' }} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'history' && (
          <div
            style={{
              background: '#fff',
              borderRadius: '0.75rem',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={thStyle}>{t('printedAt')}</th>
                  <th style={thStyle}>{t('printerName')}</th>
                  <th style={thStyle}>{t('documentTypes')}</th>
                  <th style={thStyle}>{t('printMethod')}</th>
                  <th style={thStyle}>{t('printStatus')}</th>
                  <th style={thStyle}>{t('printDuration')}</th>
                </tr>
              </thead>
              <tbody>
                {jobs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}
                    >
                      {t('noPrintJobs')}
                    </td>
                  </tr>
                ) : (
                  jobs.map((job: any) => (
                    <tr key={job.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={tdStyle}>
                        {new Date(job.printedAt ?? job.printed_at).toLocaleString('fr-FR')}
                      </td>
                      <td style={tdStyle}>{job.printer?.name ?? '—'}</td>
                      <td style={tdStyle}>{job.documentType ?? job.document_type}</td>
                      <td style={tdStyle}>{job.method ?? '—'}</td>
                      <td style={tdStyle}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          {job.status === 'success' ? (
                            <CheckCircle style={{ width: 14, height: 14, color: '#22c55e' }} />
                          ) : job.status === 'failed' ? (
                            <XCircle style={{ width: 14, height: 14, color: '#ef4444' }} />
                          ) : (
                            <Clock style={{ width: 14, height: 14, color: '#f97316' }} />
                          )}
                          {job.status}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        {job.durationMs != null ? `${job.durationMs}ms` : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {jobsMeta.total > jobsMeta.limit && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem',
                  borderTop: '1px solid #e2e8f0',
                }}
              >
                <button
                  onClick={() => setJobsPage((p) => Math.max(1, p - 1))}
                  disabled={!jobsMeta.hasPrev}
                  style={{ ...btnSecondary, opacity: jobsMeta.hasPrev ? 1 : 0.4 }}
                >
                  ← Précédent
                </button>
                <span style={{ padding: '0.5rem', color: '#64748b', fontSize: '0.875rem' }}>
                  Page {jobsPage}
                </span>
                <button
                  onClick={() => setJobsPage((p) => p + 1)}
                  disabled={!jobsMeta.hasNext}
                  style={{ ...btnSecondary, opacity: jobsMeta.hasNext ? 1 : 0.4 }}
                >
                  Suivant →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Setup guides (collapsible) */}
        {activeTab === 'printers' && (
          <details style={{ marginTop: '2rem' }}>
            <summary
              style={{
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '1rem',
                color: '#1e293b',
                padding: '0.75rem 0',
              }}
            >
              {t('setupGuides')}
            </summary>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1rem',
                marginTop: '0.75rem',
              }}
            >
              {[
                {
                  title: 'Windows / Mac (USB)',
                  desc: "Installer QZ Tray, connecter l'imprimante USB, elle sera détectée automatiquement.",
                },
                {
                  title: 'WiFi — Epson',
                  desc: "Connecter l'imprimante au même réseau. Renseigner l'IP dans les paramètres. Le port par défaut est 8008.",
                },
                {
                  title: 'WiFi — Star Micronics',
                  desc: "Activer WebPRNT dans les paramètres de l'imprimante. Renseigner l'IP. Le port par défaut est 80.",
                },
                {
                  title: 'iOS (AirPrint)',
                  desc: "Aucune configuration nécessaire. L'impression utilise le dialogue natif du navigateur avec AirPrint.",
                },
                {
                  title: 'Android (Mopria)',
                  desc: "Aucune configuration nécessaire. L'impression utilise le dialogue natif du navigateur avec Mopria.",
                },
              ].map((guide) => (
                <div
                  key={guide.title}
                  style={{
                    padding: '1rem',
                    background: '#f8fafc',
                    borderRadius: '0.75rem',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <h4 style={{ margin: '0 0 0.5rem', color: '#1e293b' }}>{guide.title}</h4>
                  <p
                    style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.5 }}
                  >
                    {guide.desc}
                  </p>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <Modal
          isOpen={showModal}
          title={editingPrinter ? t('editPrinter') : t('addPrinter')}
          onClose={() => {
            setShowModal(false);
            setEditingPrinter(null);
          }}
        >
          <PrinterForm
            printer={editingPrinter ?? undefined}
            isLoading={createMutation.isPending || updateMutation.isPending}
            onSubmit={(data) => {
              if (editingPrinter) {
                updateMutation.mutate({ id: editingPrinter.id, data });
              } else {
                createMutation.mutate(data);
              }
            }}
          />
        </Modal>
      )}
    </AdminLayout>
  );
}

// ── Shared inline styles ──────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  borderRadius: '0.5rem',
  border: '1px solid #e2e8f0',
  fontSize: '0.875rem',
  outline: 'none',
  boxSizing: 'border-box',
};

const btnPrimary: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.5rem 1rem',
  borderRadius: '0.5rem',
  border: 'none',
  background: 'var(--primary-color, #235ae4)',
  color: '#fff',
  fontWeight: 600,
  fontSize: '0.875rem',
  cursor: 'pointer',
};

const btnSecondary: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.5rem 0.75rem',
  borderRadius: '0.5rem',
  border: '1px solid #e2e8f0',
  background: '#fff',
  color: '#374151',
  fontWeight: 500,
  fontSize: '0.875rem',
  cursor: 'pointer',
};

const btnIcon: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 36,
  height: 36,
  borderRadius: '0.5rem',
  border: '1px solid #e2e8f0',
  background: '#fff',
  cursor: 'pointer',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '0.625rem 1rem',
  fontWeight: 600,
  color: '#475569',
  fontSize: '0.8125rem',
};

const tdStyle: React.CSSProperties = {
  padding: '0.625rem 1rem',
  color: '#1e293b',
};
