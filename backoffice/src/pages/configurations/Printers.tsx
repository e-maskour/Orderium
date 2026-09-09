import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Printer,
  PlayCircle,
  Usb,
  Globe,
  Monitor,
  CheckCircle,
  XCircle,
  Clock,
  Info,
  Loader2,
  Plug,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../../components/AdminLayout';
import { PageHeader } from '../../components/PageHeader';
import { Modal } from '../../components/Modal';
import { Button } from 'primereact/button';
import { useLanguage } from '../../context/LanguageContext';
import { toastError, toastConfirm, toastSuccess } from '../../services/toast.service';
import {
  printersService,
  type IPrinter,
  type CreatePrinterDTO,
  type UpdatePrinterDTO,
} from '../../modules/printers';
import { warehousesService } from '../../modules/warehouses';
import { usePrint } from '../../hooks/usePrint';
import { detectPlatform } from '@shared-print/PrintManager';
import type { TranslationKey } from '../../lib/i18n';

/**
 * Option labels carry a `labelKey` when they are prose. Brand and protocol
 * names (Epson, Star Micronics, QZ Tray, WiFi, USB) are proper nouns and stay
 * untranslated in every language — `optionLabel` below resolves whichever
 * applies.
 */
interface PrinterOption {
  value: string;
  label: string;
  labelKey?: TranslationKey;
}

/** Falls back to the literal label for proper nouns that carry no key. */
const optionLabel = (
  o: { label: string; labelKey?: TranslationKey } | undefined,
  t: (k: TranslationKey) => string,
): string => (o ? (o.labelKey ? t(o.labelKey) : o.label) : '');

const BRAND_OPTIONS = [
  { value: 'epson', label: 'Epson' },
  { value: 'star', label: 'Star Micronics' },
  { value: 'generic', label: 'Générique', labelKey: 'printerBrandGeneric' },
] as const satisfies readonly PrinterOption[];

// 'qztray' and 'browser' were transports, not brands, and no longer exist.
const CONNECTION_OPTIONS = [
  { value: 'network', label: 'Réseau (IP)', labelKey: 'printerConnectionNetwork', icon: Globe },
  { value: 'usb', label: 'USB', icon: Usb },
  { value: 'system', label: 'File d’impression', labelKey: 'printerConnSystem', icon: Monitor },
] as const;

const KIND_OPTIONS = [
  { value: 'thermal', label: 'Ticket (ESC/POS)', labelKey: 'printerKindThermal' },
  { value: 'document', label: 'Document (PDF A4)', labelKey: 'printerKindDocument' },
] as const;

const PAPER_WIDTHS = [
  { value: 80, label: '80mm (ticket)', labelKey: 'printerPaper80' },
  { value: 148, label: '148mm (A5)' },
];

const DOC_TYPE_OPTIONS = [
  { value: 'receipt', label: 'Ticket de caisse', labelKey: 'printerDocReceipt' },
  { value: 'bl', label: 'Bon de livraison', labelKey: 'printerDocDeliveryNote' },
  { value: 'devis', label: 'Devis', labelKey: 'quote' },
  { value: 'bon_commande', label: 'Bon de commande', labelKey: 'printerDocPurchaseOrder' },
  { value: 'pos', label: 'POS' },
  { value: 'stock', label: 'Stock' },
];

function PrinterForm({
  printer,
  warehouses,
  onSubmit,
  isLoading,
}: {
  printer?: IPrinter;
  warehouses: { id: number; name: string }[];
  onSubmit: (data: CreatePrinterDTO) => void;
  isLoading: boolean;
}) {
  const { t } = useLanguage();
  const [form, setForm] = useState<CreatePrinterDTO>({
    name: printer?.name ?? '',
    brand: (printer?.brand ?? 'epson') as CreatePrinterDTO['brand'],
    connectionType: (printer?.connectionType ??
      'network') as CreatePrinterDTO['connectionType'],
    kind: (printer?.kind ?? 'thermal') as CreatePrinterDTO['kind'],
    warehouseId: printer?.warehouseId ?? warehouses[0]?.id ?? 0,
    systemName: printer?.systemName ?? undefined,
    model: printer?.model ?? undefined,
    ip: printer?.ip ?? undefined,
    port: printer?.port ?? 9100,
    paperWidth: (printer?.paperWidth as CreatePrinterDTO['paperWidth']) ?? 80,
    isDefault: printer?.isDefault ?? false,
    documentTypes: printer?.documentTypes ?? ['receipt'],
  });

  const showIpField = form.connectionType === 'network';
  const showSystemNameField = ['usb', 'system'].includes(form.connectionType);

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
            {t('printerWarehouse')}
          </label>
          <select
            value={form.warehouseId}
            onChange={(e) => setForm({ ...form, warehouseId: Number(e.target.value) })}
            required
            style={inputStyle}
          >
            {warehouses.length === 0 && <option value={0}>—</option>}
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          <small style={{ color: 'var(--text-secondary)' }}>
            {t('printerWarehouseHint')}
          </small>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>
            {t('printerKind')}
          </label>
          <select
            value={form.kind}
            onChange={(e) =>
              setForm({ ...form, kind: e.target.value as CreatePrinterDTO['kind'] })
            }
            style={inputStyle}
          >
            {KIND_OPTIONS.map((k) => (
              <option key={k.value} value={k.value}>
                {optionLabel(k, t)}
              </option>
            ))}
          </select>
        </div>
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
                {optionLabel(c, t)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {showSystemNameField && (
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>
            {t('printerSystemName')}
          </label>
          <input
            type="text"
            value={form.systemName ?? ''}
            onChange={(e) => setForm({ ...form, systemName: e.target.value })}
            placeholder="EPSON TM-T20III Receipt"
            required
            maxLength={120}
            style={inputStyle}
          />
          <small style={{ color: 'var(--text-secondary)' }}>{t('printerSystemNameHint')}</small>
        </div>
      )}

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
                border: '1px solid var(--erp-border)',
                cursor: 'pointer',
                background: form.documentTypes.includes(dt.value) ? 'var(--primary-50)' : '#fff',
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
        {isLoading ? t('saving') : printer ? t('editPrinter') : t('addPrinter')}
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
  const [activeTab, setActiveTab] = useState<'printers' | 'agents' | 'history'>(
    'printers',
  );
  const [jobsPage, setJobsPage] = useState(1);

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehousesService.getAll(),
  });

  // ── Agents ─────────────────────────────────────────────
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentWarehouse, setNewAgentWarehouse] = useState<number>(0);
  const [pairingCode, setPairingCode] = useState<string | null>(null);

  const { data: agents = [] } = useQuery({
    queryKey: ['print-agents'],
    queryFn: () => printersService.getAgents(),
    enabled: activeTab === 'agents',
    // Online state comes from a 30s heartbeat; refresh so a shop coming back
    // online becomes visible without a manual reload.
    refetchInterval: activeTab === 'agents' ? 15_000 : false,
  });

  const createAgentMutation = useMutation({
    mutationFn: (dto: { name: string; warehouseId: number }) =>
      printersService.createAgent(dto),
    onSuccess: (res) => {
      // Shown once and never retrievable again.
      setPairingCode(res.pairingCode);
      void queryClient.invalidateQueries({ queryKey: ['print-agents'] });
    },
  });

  const revokeAgentMutation = useMutation({
    mutationFn: (id: string) => printersService.revokeAgent(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['print-agents'] }),
  });

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

  /**
   * Queues a real job against this printer rather than printing in the
   * browser. A browser-side test proved nothing about the actual path a
   * receipt takes, which is how silent printing appeared to work for so long.
   */
  const testPrint = usePrint();
  const [testingPrinterId, setTestingPrinterId] = useState<string | null>(null);

  const handleTestPrint = (printer: IPrinter) => {
    if (!printer.warehouseId) {
      toastError(t('printerNoWarehouse'));
      return;
    }
    setTestingPrinterId(printer.id);
    void testPrint.print({
      documentType: 'receipt',
      documentRef: 0, // test-page marker; the API renders a fixed sample
      printerId: printer.id,
    });
  };

  useEffect(() => {
    if (!testingPrinterId) return;
    if (testPrint.state === 'printed') {
      toastSuccess(t('testPrintSent'));
      setTestingPrinterId(null);
      testPrint.reset();
    } else if (testPrint.state === 'offline') {
      toastError(t('testPrintNoAgent'));
      setTestingPrinterId(null);
      testPrint.reset();
    } else if (testPrint.state === 'failed') {
      toastError(`${t('testPrintFailed')} : ${testPrint.error ?? '—'}`);
      setTestingPrinterId(null);
      testPrint.reset();
    }
  }, [testPrint.state, testingPrinterId, testPrint, toastSuccess, toastError]);

  const handleDelete = (printer: IPrinter) => {
    toastConfirm(
      t('deletePrinterConfirm') || t('confirmDeletePrinter'),
      () => deleteMutation.mutate(printer.id),
      { variant: 'destructive', confirmLabel: t('deletePrinter') },
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
                background: 'var(--erp-border-light)',
                border: '1.5px solid var(--erp-border)',
                color: 'var(--text-label)',
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
            background: 'var(--erp-bg)',
            borderRadius: '0.75rem',
            marginBottom: '1.5rem',
            border: '1px solid var(--erp-border)',
          }}
        >
          <Info style={{ width: 20, height: 20, color: 'var(--text-label)', flexShrink: 0 }} />
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <strong>{t('platformDetection')}:</strong> {platform.os.toUpperCase()}
            {platform.isMobile ? t('printerMobileSuffix') : t('printerDesktopSuffix')}
            {' · '}
            <strong>{t('recommendedSetup')}:</strong>{' '}
            {platform.os === 'ios'
              ? 'AirPrint (navigateur)'
              : platform.os === 'android'
                ? 'Mopria (navigateur)'
                : 'Dialogue d’impression du navigateur'}
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '0.25rem',
            borderBottom: '2px solid var(--erp-border)',
            marginBottom: '1.5rem',
          }}
        >
          {(['printers', 'agents', 'history'] as const).map((tab) => (
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
                  activeTab === tab ? '2px solid var(--primary-color)' : '2px solid transparent',
                color: activeTab === tab ? 'var(--primary-color)' : 'var(--text-label)',
                marginBottom: -2,
              }}
            >
              {tab === 'printers'
                ? t('printers')
                : tab === 'agents'
                  ? t('printAgents')
                  : t('printHistory')}
            </button>
          ))}
        </div>

        {activeTab === 'printers' && (
          <>
            {isLoading ? (
              <div
                style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-placeholder)' }}
              >
                <i className="pi pi-spin pi-spinner" style={{ fontSize: '2rem' }} />
              </div>
            ) : printers.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '3rem',
                  background: '#fff',
                  borderRadius: '0.75rem',
                  border: '1px solid var(--erp-border)',
                }}
              >
                <Printer
                  style={{ width: 48, height: 48, color: '#cbd5e1', margin: '0 auto 1rem' }}
                />
                <p style={{ color: 'var(--text-label)' }}>{t('noprinters')}</p>
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
                      border: `1.5px solid ${printer.isDefault ? 'var(--primary-color)' : 'var(--erp-border)'}`,
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
                            ? 'var(--primary-color)'
                            : 'var(--erp-border-light)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Printer
                          style={{
                            width: 20,
                            height: 20,
                            color: printer.isDefault ? '#fff' : 'var(--text-label)',
                          }}
                        />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {printer.name}
                          {printer.isDefault && (
                            <span
                              style={{
                                marginLeft: 8,
                                fontSize: '0.7rem',
                                background: 'var(--primary-50)',
                                color: 'var(--primary-color)',
                                padding: '2px 8px',
                                borderRadius: 12,
                                fontWeight: 600,
                              }}
                            >
                              {t('printerDefault')}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-label)' }}>
                          {optionLabel(
                            BRAND_OPTIONS.find((b) => b.value === printer.brand),
                            t,
                          )}{' '}
                          · {printer.model ?? printer.brand} ·{' '}
                          {
                            CONNECTION_OPTIONS.find((c) => c.value === printer.connectionType)
                              ?.label
                          }{' '}
                          · {printer.paperWidth}mm
                          {printer.ip && ` · ${printer.ip}:${printer.port}`}
                        </div>
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-placeholder)',
                            marginTop: 2,
                          }}
                        >
                          {printer.documentTypes.join(', ')}
                          {printer.lastSeenAt && (
                            <span style={{ marginLeft: 8 }}>
                              · {t('printerLastSeen')}{' '}
                              {new Date(printer.lastSeenAt).toLocaleDateString('fr-FR')}
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
                        <Pencil style={{ width: 16, height: 16, color: 'var(--text-label)' }} />
                      </button>
                      <button
                        onClick={() => handleDelete(printer)}
                        style={btnIcon}
                        title={t('deletePrinter')}
                      >
                        <Trash2
                          style={{ width: 16, height: 16, color: 'var(--status-unpaid-text)' }}
                        />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'agents' && (
          <>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '1rem',
                marginBottom: '1rem',
              }}
            >
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
                {t('printAgentsIntro')}
              </p>
              <button
                onClick={() => {
                  setNewAgentName('');
                  setNewAgentWarehouse(warehouses[0]?.id ?? 0);
                  setPairingCode(null);
                  setShowAgentModal(true);
                }}
                style={{ ...btnPrimary, whiteSpace: 'nowrap' }}
              >
                <Plus style={{ width: 16, height: 16 }} />
                {t('addPrintAgent')}
              </button>
            </div>

            {agents.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '3rem',
                  color: 'var(--text-placeholder)',
                }}
              >
                {t('noPrintAgents')}
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.875rem 1rem',
                      border: '1px solid var(--erp-border)',
                      borderRadius: '0.75rem',
                      background: 'var(--erp-bg)',
                      opacity: agent.revokedAt ? 0.5 : 1,
                    }}
                  >
                    <span
                      title={agent.online ? t('printAgentOnline') : t('printAgentOffline')}
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        flexShrink: 0,
                        backgroundColor: agent.online ? '#059669' : '#9ca3af',
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>{agent.name}</div>
                      <div
                        style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}
                      >
                        {warehouses.find((w) => w.id === agent.warehouseId)?.name ??
                          `${t('printerWarehouse')} ${agent.warehouseId}`}
                        {agent.platform && ` · ${agent.platform}`}
                        {agent.version && ` · v${agent.version}`}
                        {agent.lastSeenAt &&
                          ` · ${t('printAgentSeen')} ${new Date(agent.lastSeenAt).toLocaleString()}`}
                        {agent.revokedAt && ` · ${t('printAgentRevoked')}`}
                      </div>
                    </div>
                    {!agent.revokedAt && (
                      <button
                        onClick={() => {
                          toastConfirm(
                            t('revokePrintAgentConfirm'),
                            () => revokeAgentMutation.mutate(agent.id),
                            { variant: 'destructive', confirmLabel: t('revokePrintAgent') },
                          );
                        }}
                        style={btnSecondary}
                      >
                        {t('revokePrintAgent')}
                      </button>
                    )}
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
              border: '1px solid var(--erp-border)',
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr
                  style={{
                    background: 'var(--erp-border-light)',
                    borderBottom: '1px solid var(--erp-border)',
                  }}
                >
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
                      style={{
                        textAlign: 'center',
                        padding: '2rem',
                        color: 'var(--text-placeholder)',
                      }}
                    >
                      {t('noPrintJobs')}
                    </td>
                  </tr>
                ) : (
                  jobs.map((job: any) => (
                    <tr key={job.id} style={{ borderBottom: '1px solid var(--erp-border-light)' }}>
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
                            <XCircle
                              style={{ width: 14, height: 14, color: 'var(--status-unpaid-text)' }}
                            />
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
                  borderTop: '1px solid var(--erp-border)',
                }}
              >
                <button
                  onClick={() => setJobsPage((p) => Math.max(1, p - 1))}
                  disabled={!jobsMeta.hasPrev}
                  style={{ ...btnSecondary, opacity: jobsMeta.hasPrev ? 1 : 0.4 }}
                >
                  ← Précédent
                </button>
                <span
                  style={{ padding: '0.5rem', color: 'var(--text-label)', fontSize: '0.875rem' }}
                >
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
                color: 'var(--text-primary)',
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
                  desc: t('printerHelpUsb'),
                },
                {
                  title: 'WiFi — Epson',
                  desc: t('printerHelpEpson'),
                },
                {
                  title: 'WiFi — Star Micronics',
                  desc: t('printerHelpWebprnt'),
                },
                {
                  title: 'iOS (AirPrint)',
                  desc: t('printerHelpAirprint'),
                },
                {
                  title: 'Android (Mopria)',
                  desc: t('printerHelpMopria'),
                },
              ].map((guide) => (
                <div
                  key={guide.title}
                  style={{
                    padding: '1rem',
                    background: 'var(--erp-border-light)',
                    borderRadius: '0.75rem',
                    border: '1px solid var(--erp-border)',
                  }}
                >
                  <h4 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>
                    {guide.title}
                  </h4>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.8125rem',
                      color: 'var(--text-label)',
                      lineHeight: 1.5,
                    }}
                  >
                    {guide.desc}
                  </p>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* Add Agent Modal */}
      {showAgentModal && (
        <Modal
          isOpen={showAgentModal}
          title={pairingCode ? t('pairingCode') : t('addPrintAgent')}
          onClose={() => {
            setShowAgentModal(false);
            setPairingCode(null);
          }}
        >
          {pairingCode ? (
            <div style={{ display: 'grid', gap: '1rem' }}>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                {t('pairingRunOnMachine')}
              </p>
              <code
                style={{
                  display: 'block',
                  padding: '0.875rem',
                  borderRadius: '0.5rem',
                  background: 'var(--erp-bg)',
                  border: '1px solid var(--erp-border)',
                  fontSize: '0.8125rem',
                  wordBreak: 'break-all',
                }}
              >
                orderium-print-agent pair --url {window.location.origin} --code{' '}
                <strong>{pairingCode}</strong>
              </code>

              <button
                onClick={() => void navigator.clipboard?.writeText(pairingCode)}
                style={btnSecondary}
              >
                {t('copyPairingCode')}
              </button>

              <div
                style={{
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  background: '#fffbeb',
                  border: '1px solid #fcd34d',
                  fontSize: '0.8125rem',
                }}
              >
                {t('pairingCodeWarning')}
              </div>

              <button
                onClick={() => {
                  setShowAgentModal(false);
                  setPairingCode(null);
                }}
                style={btnPrimary}
              >
                {t('done')}
              </button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createAgentMutation.mutate({
                  name: newAgentName,
                  warehouseId: newAgentWarehouse,
                });
              }}
              style={{ display: 'grid', gap: '1rem' }}
            >
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>
                  {t('printAgentName')}
                </label>
                <input
                  type="text"
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  placeholder="Caisse principale"
                  required
                  maxLength={60}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>
                  {t('printerWarehouse')}
                </label>
                <select
                  value={newAgentWarehouse}
                  onChange={(e) => setNewAgentWarehouse(Number(e.target.value))}
                  required
                  style={inputStyle}
                >
                  {warehouses.length === 0 && <option value={0}>—</option>}
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
                <small style={{ color: 'var(--text-secondary)' }}>
                  {t('printAgentWarehouseHint')}
                </small>
              </div>

              <button
                type="submit"
                disabled={createAgentMutation.isPending || !newAgentWarehouse}
                style={{
                  ...btnPrimary,
                  opacity: createAgentMutation.isPending || !newAgentWarehouse ? 0.6 : 1,
                }}
              >
                {createAgentMutation.isPending
                  ? t('creatingPrintAgent')
                  : t('createAndPair')}
              </button>
            </form>
          )}
        </Modal>
      )}

      {/* Add / Edit Modal */}
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
            warehouses={warehouses}
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
  border: '1px solid var(--erp-border)',
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
  background: 'var(--primary-color)',
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
  border: '1px solid var(--erp-border)',
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
  border: '1px solid var(--erp-border)',
  background: '#fff',
  cursor: 'pointer',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '0.625rem 1rem',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  fontSize: '0.8125rem',
};

const tdStyle: React.CSSProperties = {
  padding: '0.625rem 1rem',
  color: 'var(--text-primary)',
};
