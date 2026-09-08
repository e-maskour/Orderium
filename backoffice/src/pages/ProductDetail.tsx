import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productsService } from '../modules/products';
import {
  productFormSchema,
  type ProductFormValues,
} from '../modules/products/schemas/product-form.schema';
import { warehousesService } from '../modules/warehouses';
import { stockService } from '../modules/stock';
import { categoriesService } from '../modules/categories';
import { brandsService } from '../modules/brands';
import { taxesService } from '../modules/taxes';
import { uomService } from '../modules/uom';
import { AdminLayout } from '../components/AdminLayout';
import { DocPageHeader } from '../components/DocPageHeader';
import { ImageUpload } from '../components/ImageUpload';
import { Save, Plus, ArrowRightLeft, Building2, AlertCircle, Package } from 'lucide-react';
import {
  toastSuccess,
  toastUpdated,
  toastDeleted,
  toastError,
  toastConfirm,
} from '../services/toast.service';
import { generateUniqueProductCode } from '../utils/uniqueCodeGenerator';
import { useLanguage } from '../context/LanguageContext';
import { useApiErrors } from '../hooks/useApiErrors';
import type { TranslationKey } from '../lib/i18n';
import { Button } from 'primereact/button';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputNumber } from 'primereact/inputnumber';
import { Dialog } from 'primereact/dialog';
import { TabView, TabPanel } from 'primereact/tabview';
import { RadioButton } from 'primereact/radiobutton';
import { AutoCompleteSelect } from '../components/ui/AutoCompleteSelect';
import {
  ProductForm,
  ProductFormSkeleton,
  FormErrorSummary,
  FormField,
  FIELD_IDS,
  type SummaryEntry,
} from '../components/product';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, language } = useLanguage();
  const currency = language === 'ar' ? 'د.م' : 'DH';

  const [showStockCorrection, setShowStockCorrection] = useState(false);
  const [showStockTransfer, setShowStockTransfer] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [summary, setSummary] = useState<SummaryEntry[]>([]);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      name: '',
      code: '',
      description: '',
      price: null,
      cost: null,
      minPrice: null,
      saleTaxId: null,
      purchaseTaxId: null,
      saleUnitId: null,
      purchaseUnitId: null,
      categoryIds: [],
      brandId: null,
      warehouseId: null,
      isService: false,
      isEnabled: true,
      isPriceChangeAllowed: true,
    },
  });

  const {
    handleSubmit: rhfHandleSubmit,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = form;
  const { handleApiErrors } = useApiErrors(form);

  const [stockCorrectionData, setStockCorrectionData] = useState({
    warehouseId: '',
    quantity: '',
    operation: 'add' as 'add' | 'remove',
    unitPrice: '',
    notes: '',
  });

  const [stockTransferData, setStockTransferData] = useState({
    sourceWarehouseId: '',
    destWarehouseId: '',
    quantity: '',
    notes: '',
  });

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsService.getProduct(Number(id)),
    enabled: !!id,
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehousesService.getAll(),
  });

  const { data: taxesConfig } = useQuery({
    queryKey: ['taxes', 'configuration'],
    queryFn: () => taxesService.getConfiguration(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', 'product'],
    queryFn: () => categoriesService.getByType('product'),
  });

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: () => brandsService.getAll(),
  });

  const { data: uoms = [] } = useQuery({
    queryKey: ['uom'],
    queryFn: () => uomService.getAll(),
  });

  const { data: stockQuants = [] } = useQuery({
    queryKey: ['stock-quants', id],
    queryFn: () => stockService.getProductStock(Number(id)),
    enabled: !!id,
  });

  const taxRates = taxesConfig?.rates || [];

  const updateMutation = useMutation({
    mutationFn: (data: any) => productsService.updateProduct(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toastUpdated(t('productUpdatedSuccessfully'));
    },
    onError: (error: any) => {
      handleApiErrors(error);
    },
  });

  const stockCorrectionMutation = useMutation({
    mutationFn: async (data: any) => {
      const movement = await stockService.createMovement({
        movementType: 'adjustment',
        productId: Number(id),
        destWarehouseId: data.operation === 'add' ? Number(data.warehouseId) : undefined,
        sourceWarehouseId: data.operation === 'remove' ? Number(data.warehouseId) : undefined,
        quantity: Number(data.quantity),
        notes: data.notes || `Stock correction for product ${product?.code || id}`,
      });
      await stockService.validateMovement({ movementId: movement.id });
      return movement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-quants', id] });
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setShowStockCorrection(false);
      setStockCorrectionData({
        warehouseId: '',
        quantity: '',
        operation: 'add',
        unitPrice: '',
        notes: '',
      });
      toastUpdated(t('stockCorrectedSuccessfully'));
    },
    onError: (error: any) => {
      toastError(error.message || t('failedToCorrectStock'));
    },
  });

  const stockTransferMutation = useMutation({
    mutationFn: (data: any) =>
      stockService.internalTransfer({
        productId: Number(id),
        sourceWarehouseId: Number(data.sourceWarehouseId),
        destWarehouseId: Number(data.destWarehouseId),
        quantity: Number(data.quantity),
        notes: data.notes || `Stock transfer for product ${product?.code || id}`,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-quants', id] });
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setShowStockTransfer(false);
      setStockTransferData({ sourceWarehouseId: '', destWarehouseId: '', quantity: '', notes: '' });
      toastUpdated(t('stockTransferredSuccessfully'));
    },
    onError: (error: any) => {
      toastError(error.message || t('failedToTransferStock'));
    },
  });

  useEffect(() => {
    if (product) {
      const productCategories = (product as any).categories || [];
      const defaultUom =
        uoms.length > 0 ? uoms.find((u: any) => u.code === 'UNIT') || uoms[0] : null;
      reset({
        name: product.name,
        code: product.code || '',
        description: product.description || '',
        price: product.price,
        cost: product.cost,
        minPrice: product.minPrice,
        saleTaxId: taxRates.find((r: any) => r.rate === product.saleTax)?.name ?? null,
        purchaseTaxId: taxRates.find((r: any) => r.rate === product.purchaseTax)?.name ?? null,
        saleUnitId: (product as any).saleUnitOfMeasure?.id ?? defaultUom?.id ?? null,
        purchaseUnitId: (product as any).purchaseUnitOfMeasure?.id ?? defaultUom?.id ?? null,
        categoryIds: productCategories.map((c: any) => c.id),
        brandId: (product as any).brandId ?? null,
        warehouseId: product.warehouseId ?? null,
        isService: product.isService,
        isEnabled: product.isEnabled,
        isPriceChangeAllowed: product.isPriceChangeAllowed,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, taxRates.length, uoms.length]);

  // If uoms loaded after product, backfill missing unit defaults
  useEffect(() => {
    if (uoms.length > 0 && product) {
      const defaultUom = uoms.find((u: any) => u.code === 'UNIT') || uoms[0];
      const cur = form.getValues();
      if (!cur.saleUnitId) setValue('saleUnitId', defaultUom.id, { shouldDirty: false });
      if (!cur.purchaseUnitId) setValue('purchaseUnitId', defaultUom.id, { shouldDirty: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uoms.length]);

  // Unsaved changes guard (covers browser refresh/close)
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const handleRegenerateCode = async () => {
    try {
      setIsGeneratingCode(true);
      const uniqueCode = await generateUniqueProductCode();
      setValue('code', uniqueCode);
      toastSuccess(t('newUniqueCodeGenerated'));
    } catch {
      toastError(t('failedToGenerateUniqueCode'));
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const onSubmit = (data: ProductFormValues) => {
    setSummary([]);
    const saleTaxRate = taxRates.find((r: any) => r.name === data.saleTaxId);
    const purchaseTaxRate = taxRates.find((r: any) => r.name === data.purchaseTaxId);
    updateMutation.mutate({
      name: data.name,
      code: data.code || null,
      description: data.description || null,
      price: data.price ?? 0,
      cost: data.cost ?? 0,
      minPrice: data.minPrice ?? 0,
      saleTax: saleTaxRate?.rate ?? 0,
      purchaseTax: purchaseTaxRate?.rate ?? 0,
      warehouseId: data.warehouseId,
      categoryIds: data.categoryIds,
      brandId: data.brandId ?? null,
      isService: data.isService,
      isEnabled: data.isEnabled,
      isPriceChangeAllowed: data.isPriceChangeAllowed,
      saleUnitId: data.saleUnitId,
      purchaseUnitId: data.purchaseUnitId,
    });
  };

  const fieldLabels = useMemo(
    () =>
      ({
        name: t('productName'),
        code: t('productCodeEAN13'),
        description: t('description'),
        price: t('price'),
        cost: t('costPrice'),
        minPrice: t('minPrice'),
        warehouseId: t('warehouse'),
      }) as Record<string, string>,
    [t],
  );

  const onInvalidSubmit = () => {
    // Validation errors live on the Details tab — surface it before pointing at fields
    setActiveTabIndex(0);
    setSummary(
      Object.entries(errors)
        .filter(([field]) => field in FIELD_IDS)
        .map(([field, e]) => ({
          fieldId: FIELD_IDS[field as keyof typeof FIELD_IDS],
          label: fieldLabels[field] ?? field,
          message: t((e as any)?.message as TranslationKey),
        })),
    );
    toastError(t('validationCheckFields'));
  };

  const handleSave = rhfHandleSubmit(onSubmit, onInvalidSubmit);

  const handleCancel = () => {
    if (isDirty) {
      toastConfirm(t('unsavedChangesConfirm' as TranslationKey), () => navigate('/products'), {
        confirmLabel: t('cancel'),
        variant: 'warning',
      } as any);
    } else {
      navigate('/products');
    }
  };

  // ── Stock aggregates ──
  const sum = (key: string) =>
    stockQuants.reduce((s: number, q: any) => s + parseFloat(q[key]?.toString() || '0'), 0);
  const totalOnHand = sum('quantity');
  const totalAvailable = sum('availableQuantity');
  const totalReserved = sum('reservedQuantity');
  const totalIncoming = sum('incomingQuantity');
  const totalOutgoing = sum('outgoingQuantity');

  const warehouseDropdownOptions = warehouses.map((w: any) => ({
    label: w.name,
    value: w.id.toString(),
  }));
  const destWarehouseOptions = warehouses
    .filter((wh: any) => wh.id.toString() !== stockTransferData.sourceWarehouseId)
    .map((wh: any) => ({ label: wh.name, value: wh.id.toString() }));

  const saving = updateMutation.isPending;

  // ── Loading: skeleton that matches the real layout ──
  if (isLoading) {
    return (
      <AdminLayout>
        <ProductFormSkeleton />
      </AdminLayout>
    );
  }

  if (!product) {
    return (
      <AdminLayout>
        <div className="pdetail-page">
          <div className="pform-empty">
            <AlertCircle size={40} strokeWidth={1.5} aria-hidden="true" />
            <p className="pform-empty__title">{t('notFound')}</p>
            <Button
              type="button"
              text
              label={t('backToProducts')}
              onClick={() => navigate('/products')}
            />
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="pdetail-page">
        <DocPageHeader
          icon={<Package size={24} />}
          parentLabel={t('products')}
          currentLabel={product.code || product.name}
          title={product.name}
          onBack={handleCancel}
          backAriaLabel={t('backToProducts')}
          badges={
            <>
              <span
                className={`doc-hdr__badge doc-hdr__badge--${product.isEnabled ? 'on' : 'off'}`}
              >
                {product.isEnabled ? t('active') : t('inactive')}
              </span>
              {product.isService && <span className="doc-hdr__badge">{t('isService')}</span>}
            </>
          }
        />

        <TabView
          activeIndex={activeTabIndex}
          onTabChange={(e) => setActiveTabIndex(e.index)}
          pt={{
            panelContainer: { style: { padding: 'var(--space-6) 0 0', background: 'transparent' } },
            nav: { style: { background: 'transparent' } },
          }}
        >
          {/* ── Details: the shared form, identical to create ── */}
          <TabPanel header={t('tabInformation')}>
            <div className="pform-tabbody">
              <form onSubmit={handleSave} noValidate>
                <FormErrorSummary entries={summary} />

                <ProductForm
                  mode="edit"
                  form={form}
                  options={{ warehouses, taxRates, categories, brands, uoms }}
                  currency={currency}
                  isGeneratingCode={isGeneratingCode}
                  onRegenerateCode={handleRegenerateCode}
                  saving={saving}
                  imageSlot={
                    <div className="pform-field">
                      <span className="pform-field__label">{t('productImage')}</span>
                      <ImageUpload
                        productId={Number(id)}
                        currentImage={(product as any)?.imageUrl}
                        onImageUpload={() => {
                          queryClient.invalidateQueries({ queryKey: ['product', id] });
                          toastUpdated(t('imageUpdatedSuccessfully'));
                        }}
                        onImageRemove={() => {
                          queryClient.invalidateQueries({ queryKey: ['product', id] });
                          toastDeleted(t('imageRemovedSuccessfully'));
                        }}
                      />
                    </div>
                  }
                />

                {/* ── Sticky action bar ── */}
                <div className="pform-actions">
                  <Button
                    type="button"
                    outlined
                    label={t('cancel')}
                    disabled={saving}
                    onClick={handleCancel}
                  />
                  <Button
                    type="submit"
                    label={t('saveChanges')}
                    loading={saving}
                    disabled={saving || !isDirty}
                    icon={<Save size={14} aria-hidden="true" />}
                  />
                </div>
              </form>
            </div>
          </TabPanel>

          {/* ── Stock: a separate concern, not part of the product form ── */}
          <TabPanel header={t('stock')}>
            <div className="pstock-kpis">
              {[
                { label: t('onHand'), value: totalOnHand, tone: '' },
                {
                  label: t('available'),
                  value: totalAvailable,
                  tone: totalAvailable > 0 ? ' pstock-kpi__value--ok' : ' pstock-kpi__value--neg',
                },
                {
                  label: t('reserved'),
                  value: totalReserved,
                  tone: totalReserved > 0 ? ' pstock-kpi__value--warn' : '',
                },
                { label: t('incoming'), value: totalIncoming, tone: '' },
                { label: t('outgoing'), value: totalOutgoing, tone: '' },
              ].map(({ label, value, tone }) => (
                <div className="pstock-kpi" key={label}>
                  <p className="pstock-kpi__label">{label}</p>
                  <p className={`pstock-kpi__value${tone}`}>{value.toFixed(2)}</p>
                </div>
              ))}
            </div>

            <div className="pstock-panel">
              <div className="pstock-panel__head">
                <div>
                  <h2 className="pstock-panel__title">{t('stockManagement')}</h2>
                  <p className="pstock-panel__count">
                    {stockQuants.length} {t('warehouse')}
                  </p>
                </div>
                <div className="pstock-panel__actions">
                  <Button
                    type="button"
                    size="small"
                    outlined
                    onClick={() => setShowStockCorrection(true)}
                    icon={<Plus size={14} aria-hidden="true" />}
                    label={t('correctStock')}
                  />
                  <Button
                    type="button"
                    size="small"
                    outlined
                    onClick={() => setShowStockTransfer(true)}
                    icon={<ArrowRightLeft size={14} aria-hidden="true" />}
                    label={t('transferStock')}
                  />
                </div>
              </div>

              {stockQuants.length === 0 ? (
                <div className="pform-empty">
                  <Building2 size={40} strokeWidth={1.5} aria-hidden="true" />
                  <p className="pform-empty__title">{t('noStockRecordsFound')}</p>
                  <p className="pform-empty__desc">{t('correctStock')}</p>
                </div>
              ) : (
                <div className="pstock-list">
                  {stockQuants.map((row: any) => {
                    const onHand = parseFloat(row.quantity?.toString() || '0');
                    const available = parseFloat(row.availableQuantity?.toString() || '0');
                    const reserved = parseFloat(row.reservedQuantity?.toString() || '0');
                    const incoming = parseFloat(row.incomingQuantity?.toString() || '0');
                    const outgoing = parseFloat(row.outgoingQuantity?.toString() || '0');
                    const metrics = [
                      { label: t('onHand'), value: onHand.toFixed(2), tone: '' },
                      {
                        label: t('available'),
                        value: available.toFixed(2),
                        tone:
                          available > 0
                            ? ' pstock-metric__value--ok'
                            : ' pstock-metric__value--neg',
                      },
                      {
                        label: t('reserved'),
                        value: reserved > 0 ? reserved.toFixed(2) : '—',
                        tone:
                          reserved > 0
                            ? ' pstock-metric__value--warn'
                            : ' pstock-metric__value--muted',
                      },
                      {
                        label: t('incoming'),
                        value: incoming > 0 ? incoming.toFixed(2) : '—',
                        tone: incoming > 0 ? '' : ' pstock-metric__value--muted',
                      },
                      {
                        label: t('outgoing'),
                        value: outgoing > 0 ? outgoing.toFixed(2) : '—',
                        tone: outgoing > 0 ? '' : ' pstock-metric__value--muted',
                      },
                    ];
                    return (
                      <div className="pstock-row" key={row.id ?? row.warehouseId}>
                        <p className="pstock-row__name">{row.warehouse?.name ?? t('unknown')}</p>
                        <div className="pstock-metrics">
                          {metrics.map((m) => (
                            <div className="pstock-metric" key={m.label}>
                              <p className="pstock-metric__label">{m.label}</p>
                              <p className={`pstock-metric__value${m.tone}`}>{m.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabPanel>
        </TabView>

        {/* ── Stock correction dialog ── */}
        <Dialog
          header={t('correctStock')}
          visible={showStockCorrection}
          onHide={() => setShowStockCorrection(false)}
          style={{ inlineSize: '30rem', maxInlineSize: '95vw' }}
          draggable={false}
        >
          <div className="pdlg-grid">
            <FormField id="sc-warehouse" label={t('warehouse')} required>
              {(a) => (
                <AutoCompleteSelect
                  inputId={a.id}
                  value={stockCorrectionData.warehouseId}
                  onChange={(e) =>
                    setStockCorrectionData({ ...stockCorrectionData, warehouseId: e.value })
                  }
                  options={warehouseDropdownOptions}
                  placeholder={t('selectWarehouse')}
                />
              )}
            </FormField>

            <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="pform-field__label">{t('type')}</legend>
              <div style={{ display: 'flex', gap: 'var(--space-5)' }}>
                {(['add', 'remove'] as const).map((op) => (
                  <div
                    key={op}
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
                  >
                    <RadioButton
                      inputId={`sc-op-${op}`}
                      name="sc-operation"
                      value={op}
                      checked={stockCorrectionData.operation === op}
                      onChange={(e) =>
                        setStockCorrectionData({ ...stockCorrectionData, operation: e.value })
                      }
                    />
                    <label htmlFor={`sc-op-${op}`}>{op === 'add' ? t('add') : t('remove')}</label>
                  </div>
                ))}
              </div>
            </fieldset>

            <FormField id="sc-quantity" label={t('quantity')} required>
              {(a) => (
                <InputNumber
                  inputId={a.id}
                  value={stockCorrectionData.quantity ? Number(stockCorrectionData.quantity) : null}
                  onValueChange={(e) =>
                    setStockCorrectionData({
                      ...stockCorrectionData,
                      quantity: e.value?.toString() ?? '',
                    })
                  }
                  mode="decimal"
                  minFractionDigits={2}
                  maxFractionDigits={2}
                  min={0}
                />
              )}
            </FormField>

            <FormField id="sc-notes" label={t('notes')}>
              {(a) => (
                <InputTextarea
                  id={a.id}
                  rows={2}
                  autoResize
                  value={stockCorrectionData.notes}
                  onChange={(e) =>
                    setStockCorrectionData({ ...stockCorrectionData, notes: e.target.value })
                  }
                  style={{ inlineSize: '100%', resize: 'none' }}
                />
              )}
            </FormField>
          </div>

          <div className="pdlg-actions">
            <Button
              type="button"
              outlined
              label={t('cancel')}
              onClick={() => setShowStockCorrection(false)}
            />
            <Button
              type="button"
              label={t('correctStock')}
              loading={stockCorrectionMutation.isPending}
              disabled={
                !stockCorrectionData.warehouseId ||
                !stockCorrectionData.quantity ||
                stockCorrectionMutation.isPending
              }
              onClick={() => stockCorrectionMutation.mutate(stockCorrectionData)}
            />
          </div>
        </Dialog>

        {/* ── Stock transfer dialog ── */}
        <Dialog
          header={t('transferStock')}
          visible={showStockTransfer}
          onHide={() => setShowStockTransfer(false)}
          style={{ inlineSize: '30rem', maxInlineSize: '95vw' }}
          draggable={false}
        >
          <div className="pdlg-grid">
            <FormField id="st-source" label={t('selectSourceWarehouse')} required>
              {(a) => (
                <AutoCompleteSelect
                  inputId={a.id}
                  value={stockTransferData.sourceWarehouseId}
                  onChange={(e) =>
                    setStockTransferData({ ...stockTransferData, sourceWarehouseId: e.value })
                  }
                  options={warehouseDropdownOptions}
                  placeholder={t('selectWarehouse')}
                />
              )}
            </FormField>

            <FormField id="st-dest" label={t('selectDestinationWarehouse')} required>
              {(a) => (
                <AutoCompleteSelect
                  inputId={a.id}
                  value={stockTransferData.destWarehouseId}
                  onChange={(e) =>
                    setStockTransferData({ ...stockTransferData, destWarehouseId: e.value })
                  }
                  options={destWarehouseOptions}
                  placeholder={t('selectWarehouse')}
                  disabled={!stockTransferData.sourceWarehouseId}
                />
              )}
            </FormField>

            <FormField id="st-quantity" label={t('quantity')} required>
              {(a) => (
                <InputNumber
                  inputId={a.id}
                  value={stockTransferData.quantity ? Number(stockTransferData.quantity) : null}
                  onValueChange={(e) =>
                    setStockTransferData({
                      ...stockTransferData,
                      quantity: e.value?.toString() ?? '',
                    })
                  }
                  mode="decimal"
                  minFractionDigits={2}
                  maxFractionDigits={2}
                  min={0}
                />
              )}
            </FormField>

            <FormField id="st-notes" label={t('notes')}>
              {(a) => (
                <InputTextarea
                  id={a.id}
                  rows={2}
                  autoResize
                  value={stockTransferData.notes}
                  onChange={(e) =>
                    setStockTransferData({ ...stockTransferData, notes: e.target.value })
                  }
                  style={{ inlineSize: '100%', resize: 'none' }}
                />
              )}
            </FormField>
          </div>

          <div className="pdlg-actions">
            <Button
              type="button"
              outlined
              label={t('cancel')}
              onClick={() => setShowStockTransfer(false)}
            />
            <Button
              type="button"
              label={t('transfer')}
              loading={stockTransferMutation.isPending}
              disabled={
                !stockTransferData.sourceWarehouseId ||
                !stockTransferData.destWarehouseId ||
                !stockTransferData.quantity ||
                stockTransferMutation.isPending
              }
              onClick={() => stockTransferMutation.mutate(stockTransferData)}
            />
          </div>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
