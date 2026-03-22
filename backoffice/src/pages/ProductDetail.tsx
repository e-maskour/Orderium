import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsService, validateProductForm, hasValidationErrors, getFirstError, ValidationErrors } from '../modules/products';
import { warehousesService } from '../modules/warehouses';
import { stockService } from '../modules/stock';
import { categoriesService } from '../modules/categories';
import { taxesService } from '../modules/taxes';
import { uomService } from '../modules/uom';
import { AdminLayout } from '../components/AdminLayout';
import { ImageUpload } from '../components/ImageUpload';
import { ArrowLeft, Save, Plus, ArrowRightLeft, RefreshCw, ShoppingCart, TrendingUp, SlidersHorizontal, Building2, Tag as TagIcon, Package } from 'lucide-react';
import { toastSuccess, toastUpdated, toastDeleted, toastError } from '../services/toast.service';
import { generateUniqueProductCode } from '../utils/uniqueCodeGenerator';
import { useLanguage } from '../context/LanguageContext';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputNumber } from 'primereact/inputnumber';
import { InputSwitch } from 'primereact/inputswitch';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';

import { Dialog } from 'primereact/dialog';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { ColumnGroup } from 'primereact/columngroup';
import { Row } from 'primereact/row';
import { Tag as PTag } from 'primereact/tag';
import { Message } from 'primereact/message';
import { RadioButton } from 'primereact/radiobutton';
import { TabView, TabPanel } from 'primereact/tabview';
import { formatAmount } from '@orderium/ui';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, language } = useLanguage();
  const currency = language === 'ar' ? 'د.م' : 'DH';

  const [showStockCorrection, setShowStockCorrection] = useState(false);
  const [showStockTransfer, setShowStockTransfer] = useState(false);

  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  const [formData, setFormData] = useState({
    name: '', code: '', description: '',
    price: null as number | null, cost: null as number | null, minPrice: null as number | null,
    saleTaxId: null as string | null, purchaseTaxId: null as string | null,
    saleUnitId: null as number | null, purchaseUnitId: null as number | null,
    categoryIds: [] as number[], warehouseId: null as number | null,
    isService: false, isEnabled: true, isPriceChangeAllowed: true,
  });

  const setField = <K extends keyof typeof formData>(key: K, value: typeof formData[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (validationErrors[key as string]) {
      setValidationErrors(prev => { const n = { ...prev }; delete n[key as string]; return n; });
    }
  };

  const [stockCorrectionData, setStockCorrectionData] = useState({
    warehouseId: '', quantity: '', operation: 'add' as 'add' | 'remove', unitPrice: '', notes: '',
  });

  const [stockTransferData, setStockTransferData] = useState({
    sourceWarehouseId: '', destWarehouseId: '', quantity: '', notes: '',
  });

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsService.getProduct(Number(id)),
    enabled: !!id,
  });

  const { data: warehouses = [], isLoading: warehousesLoading } = useQuery({
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
    onError: (error: any) => { toastError(error.message || t('failedToUpdateProduct')); },
  });

  const stockCorrectionMutation = useMutation({
    mutationFn: async (data: any) => {
      const movement = await stockService.createMovement({
        movementType: 'adjustment', productId: Number(id),
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
      setShowStockCorrection(false);
      setStockCorrectionData({ warehouseId: '', quantity: '', operation: 'add', unitPrice: '', notes: '' });
      toastUpdated(t('stockCorrectedSuccessfully'));
    },
    onError: (error: any) => { toastError(error.message || t('failedToCorrectStock')); },
  });

  const stockTransferMutation = useMutation({
    mutationFn: (data: any) => stockService.internalTransfer({
      productId: Number(id),
      sourceWarehouseId: Number(data.sourceWarehouseId),
      destWarehouseId: Number(data.destWarehouseId),
      quantity: Number(data.quantity),
      notes: data.notes || `Stock transfer for product ${product?.code || id}`,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-quants', id] });
      setShowStockTransfer(false);
      setStockTransferData({ sourceWarehouseId: '', destWarehouseId: '', quantity: '', notes: '' });
      toastUpdated(t('stockTransferredSuccessfully'));
    },
    onError: (error: any) => { toastError(error.message || t('failedToTransferStock')); },
  });

  useEffect(() => {
    if (product) {
      const productCategories = (product as any).categories || [];
      const defaultUom = uoms.length > 0 ? (uoms.find((u: any) => u.code === 'UNIT') || uoms[0]) : null;
      setFormData({
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
        warehouseId: product.warehouseId ?? null,
        isService: product.isService,
        isEnabled: product.isEnabled,
        isPriceChangeAllowed: product.isPriceChangeAllowed,
      });
    }
  }, [product, taxRates.length, uoms.length]);

  // If uoms loaded after the product, backfill missing unit defaults
  useEffect(() => {
    if (uoms.length > 0 && product) {
      const defaultUom = uoms.find((u: any) => u.code === 'UNIT') || uoms[0];
      setFormData(prev => ({
        ...prev,
        saleUnitId: prev.saleUnitId ?? defaultUom.id,
        purchaseUnitId: prev.purchaseUnitId ?? defaultUom.id,
      }));
    }
  }, [uoms.length]);

  const handleRegenerateCode = async () => {
    try {
      setIsGeneratingCode(true);
      const uniqueCode = await generateUniqueProductCode();
      setField('code', uniqueCode);
      toastSuccess(t('newUniqueCodeGenerated'));
    } catch {
      toastError(t('failedToGenerateUniqueCode'));
    } finally {
      setIsGeneratingCode(false);
    }
  };



  const handleSave = () => {
    const legacyForm = {
      name: formData.name, code: formData.code, description: formData.description,
      price: formData.price?.toString() ?? '',
      cost: formData.cost?.toString() ?? '',
      minPrice: formData.minPrice?.toString() ?? '',
      saleUnit: formData.saleUnitId?.toString() ?? '',
      purchaseUnit: formData.purchaseUnitId?.toString() ?? '',
      warehouseId: formData.warehouseId?.toString() ?? '',
      categoryIds: formData.categoryIds,
    };
    const errors = validateProductForm(legacyForm as any, false);
    setValidationErrors(errors);
    if (hasValidationErrors(errors)) { const firstError = getFirstError(errors); if (firstError) toastError(firstError); return; }
    const saleTaxRate = taxRates.find((r: any) => r.name === formData.saleTaxId);
    const purchaseTaxRate = taxRates.find((r: any) => r.name === formData.purchaseTaxId);
    updateMutation.mutate({
      name: formData.name, code: formData.code || null, description: formData.description || null,
      price: formData.price ?? 0, cost: formData.cost ?? 0, minPrice: formData.minPrice ?? 0,
      saleTax: saleTaxRate?.rate ?? 0, purchaseTax: purchaseTaxRate?.rate ?? 0,
      warehouseId: formData.warehouseId,
      categoryIds: formData.categoryIds, isService: formData.isService, isEnabled: formData.isEnabled,
      isPriceChangeAllowed: formData.isPriceChangeAllowed,
      saleUnitId: formData.saleUnitId, purchaseUnitId: formData.purchaseUnitId,
    });
  };

  const handleStockCorrection = () => { stockCorrectionMutation.mutate(stockCorrectionData); };
  const handleStockTransfer = () => { stockTransferMutation.mutate(stockTransferData); };

  const warehouseOptions = warehouses.map((w: any) => ({ label: `${w.name} (${w.code})`, value: w.id }));
  const categoryOptions = categories.map((c: any) => ({ label: c.name, value: c.id }));
  const uomOptions = uoms.map((u: any) => ({ label: `${u.name} — ${u.code}`, value: u.id }));
  const taxOptions = [{ label: '0%', value: null }, ...taxRates.map((r: any) => ({ label: `${r.name} (${r.rate}%)`, value: r.name }))];
  const warehouseDropdownOptions = warehouses.map((w: any) => ({ label: w.name, value: w.id.toString() }));
  const destWarehouseOptions = warehouses
    .filter((wh: any) => wh.id.toString() !== stockTransferData.sourceWarehouseId)
    .map((wh: any) => ({ label: wh.name, value: wh.id.toString() }));

  const saleTaxRate = taxRates.find((r: any) => r.name === formData.saleTaxId)?.rate ?? 0;
  const priceWithTax = formData.price != null ? formData.price * (1 + saleTaxRate / 100) : null;
  const margin = (formData.price != null && formData.cost != null) ? formData.price - formData.cost : null;
  const marginPct = (margin != null && formData.cost) ? (margin / formData.cost) * 100 : null;
  const markupPct = (margin != null && formData.price) ? (margin / formData.price) * 100 : null;
  const totalStock = stockQuants.reduce((sum, sq) => sum + parseFloat(sq.quantity?.toString() || '0'), 0);

  if (isLoading) {
    return (
      <AdminLayout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <i className="pi pi-spin pi-spinner" style={{ fontSize: '2rem', color: '#235ae4' }}></i>
        </div>
      </AdminLayout>
    );
  }

  if (!product) {
    return (
      <AdminLayout>
        <div style={{ textAlign: 'center', paddingTop: '3rem' }}>
          <p style={{ color: '#64748b' }}>Product not found</p>
        </div>
      </AdminLayout>
    );
  }

  const fieldClass = (field: string) => validationErrors[field] ? 'p-invalid' : '';

  const panel: React.CSSProperties = {
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '0.875rem',
    padding: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  };

  const iconBox = (bg: string): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '2rem',
    height: '2rem',
    borderRadius: '0.5rem',
    background: bg,
    flexShrink: 0,
  });

  const totalOnHand = stockQuants.reduce((s, sq) => s + parseFloat(sq.quantity?.toString() || '0'), 0);
  const totalAvailable = stockQuants.reduce((s, sq) => s + parseFloat(sq.availableQuantity?.toString() || '0'), 0);
  const totalReserved = stockQuants.reduce((s, sq) => s + parseFloat(sq.reservedQuantity?.toString() || '0'), 0);
  const totalIncoming = stockQuants.reduce((s, sq) => s + parseFloat(sq.incomingQuantity?.toString() || '0'), 0);
  const totalOutgoing = stockQuants.reduce((s, sq) => s + parseFloat(sq.outgoingQuantity?.toString() || '0'), 0);

  return (
    <AdminLayout>

      {/* ── Page Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '1rem',
        marginBottom: '0.75rem',
        padding: '1.125rem 1.375rem',
        background: '#ffffff',
        borderRadius: '1rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
        border: '1.5px solid #e2e8f0',
        flexWrap: 'wrap',
      }}>
        <Button
          icon={<ArrowLeft style={{ width: '1.125rem', height: '1.125rem' }} />}
          onClick={() => navigate('/products')}
          style={{ width: '2.25rem', height: '2.25rem', flexShrink: 0, background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569', borderRadius: '0.5rem', padding: 0 }}
        />
        <div style={{ width: '2.75rem', height: '2.75rem', flexShrink: 0, background: 'linear-gradient(135deg, #235ae4, #1a47b8)', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(35,90,228,0.4)' }}>
          <Package style={{ width: '1.375rem', height: '1.375rem', color: '#fff' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>{product.name}</h1>
                <PTag value={product.isEnabled ? t('active') : t('inactive')} severity={product.isEnabled ? 'success' : 'danger'} />
                {product.isService && <PTag value="Service" severity="info" />}
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0.125rem 0 0', fontFamily: 'monospace', letterSpacing: '0.03em' }}>
                {product.code || t('noCode')}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
              <Button text onClick={() => navigate('/products')} label={t('cancel')} style={{ color: '#64748b' }} />
              <Button
                onClick={handleSave}
                loading={updateMutation.isPending}
                icon={<Save style={{ width: '0.875rem', height: '0.875rem' }} />}
                label={t('saveChanges')}
              />
            </div>
          </div>
        </div>
      </div>

      <TabView
        activeIndex={activeTabIndex}
        onTabChange={(e) => setActiveTabIndex(e.index)}
        pt={{ root: { className: 'product-tabview' }, panelContainer: { style: { padding: '0.75rem 0 0', background: 'transparent' } }, nav: { style: { background: 'transparent' } } }}
      >
        <TabPanel header="Information">
          <div className="product-form-grid">

            {/* Left */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* Basic Information */}
              <div style={panel}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={iconBox('#eef2ff')}>
                    <TagIcon style={{ width: '1rem', height: '1rem', color: '#6366f1' }} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' }}>{t('basicInformation')}</h3>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>Name, barcode and description</p>
                  </div>
                </div>

                {/* Image + fields */}
                <div style={{ display: 'grid', gridTemplateColumns: '148px 1fr', gap: '1.25rem', marginBottom: '1.25rem' }} className="product-img-grid">
                  <div>
                    {id && (
                      <ImageUpload
                        productId={Number(id)}
                        currentImage={(product as any)?.imageUrl}
                        onImageUpload={() => { queryClient.invalidateQueries({ queryKey: ['product', id] }); toastUpdated(t('imageUpdatedSuccessfully')); }}
                        onImageRemove={() => { queryClient.invalidateQueries({ queryKey: ['product', id] }); toastDeleted(t('imageRemovedSuccessfully')); }}
                        folder="products"
                        maxSizeMB={5}

                      />
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="p-field">
                      <label className="p-label">{t('productName')} <span style={{ color: '#ef4444' }}>*</span></label>
                      <InputText
                        value={formData.name}
                        onChange={(e) => setField('name', e.target.value)}
                        placeholder={t('enterProductName')}
                        className={fieldClass('name')}
                        style={{ width: '100%' }}
                      />
                      {validationErrors.name && <Message severity="error" text={validationErrors.name} style={{ marginTop: '0.25rem' }} />}
                    </div>
                    <div className="p-field">
                      <label className="p-label">{t('productCodeEAN13')}</label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <InputText
                          value={formData.code}
                          onChange={(e) => setField('code', e.target.value)}
                          placeholder={t('eanBarcodeePlaceholder')}
                          maxLength={13}
                          className={fieldClass('code')}
                          style={{ flex: 1, fontFamily: 'monospace', letterSpacing: '0.05em' }}
                        />
                        <Button
                          type="button"
                          outlined
                          onClick={handleRegenerateCode}
                          disabled={isGeneratingCode}
                          icon={<RefreshCw className={isGeneratingCode ? 'animate-spin' : ''} style={{ width: '0.875rem', height: '0.875rem' }} />}
                          tooltip={t('generateNewUniqueCode')}
                          tooltipOptions={{ position: 'top' }}
                        />
                      </div>
                      {validationErrors.code && <Message severity="error" text={validationErrors.code} style={{ marginTop: '0.25rem' }} />}
                    </div>
                  </div>
                </div>



                <div className="p-field">
                  <label className="p-label">{t('description')}</label>
                  <InputTextarea
                    value={formData.description}
                    onChange={(e) => setField('description', e.target.value)}
                    rows={3}
                    autoResize
                    placeholder={t('enterProductDescription')}
                    style={{ width: '100%', resize: 'none' }}
                  />
                </div>
              </div>

            </div>

            {/* Right sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Classification */}
              <div style={panel}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={iconBox('#fff7ed')}>
                    <Building2 style={{ width: '1rem', height: '1rem', color: '#ea580c' }} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' }}>Classification</h3>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>Warehouse and categories</p>
                  </div>
                </div>

                <div className="p-field" style={{ marginBottom: '1rem' }}>
                  <label className="p-label">{t('warehouse')} <span style={{ color: '#ef4444' }}>*</span></label>
                  <Dropdown
                    value={formData.warehouseId}
                    onChange={(e) => setField('warehouseId', e.value)}
                    options={warehouseOptions}
                    placeholder={t('selectOrSearchWarehouse')}
                    filter
                    filterPlaceholder={t('search')}
                    className={fieldClass('warehouseId')}
                    style={{ width: '100%' }}
                  />
                  {validationErrors.warehouseId && <Message severity="error" text={validationErrors.warehouseId} style={{ marginTop: '0.25rem' }} />}
                </div>

                <div className="p-field">
                  <label className="p-label">{t('categories')}</label>
                  <MultiSelect
                    value={formData.categoryIds}
                    onChange={(e) => setField('categoryIds', e.value)}
                    options={categoryOptions}
                    placeholder={t('typeToSearchCategories')}
                    filter
                    display="chip"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Settings */}
              <div style={panel}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={iconBox('#f5f3ff')}>
                    <SlidersHorizontal style={{ width: '1rem', height: '1rem', color: '#7c3aed' }} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' }}>Settings</h3>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>Product behavior options</p>
                  </div>
                </div>

                {([
                  { key: 'isService' as const, label: t('isService'), desc: t('serviceDescription'), value: formData.isService, onChange: (v: boolean) => setField('isService', v) },
                  { key: 'isEnabled' as const, label: t('enabled'), desc: t('enabledDescription'), value: formData.isEnabled, onChange: (v: boolean) => setField('isEnabled', v) },
                  { key: 'isPriceChangeAllowed' as const, label: t('allowPriceChange'), desc: t('allowPriceChangeDescription'), value: formData.isPriceChangeAllowed, onChange: (v: boolean) => setField('isPriceChangeAllowed', v) },
                ] as const).map(({ key, label, desc, value, onChange }, i, arr) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', padding: '0.75rem 0', borderBottom: i < arr.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 500, fontSize: '0.875rem', color: '#0f172a', margin: 0 }}>{label}</p>
                      <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.125rem 0 0' }}>{desc}</p>
                    </div>
                    <InputSwitch checked={value} onChange={(e) => onChange(e.value ?? false)} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabPanel>
        <TabPanel header={t('pricing') || 'Tarification'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Sale Price */}
            <div style={panel}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={iconBox('#ecfdf5')}>
                  <ShoppingCart style={{ width: '1rem', height: '1rem', color: '#10b981' }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' }}>{t('salePrice')}</h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>Price shown to customers</p>
                </div>
              </div>
              <div className="product-pricing-grid">
                <div className="p-field">
                  <label className="p-label">{t('price')} <span style={{ color: '#ef4444' }}>*</span></label>
                  <InputNumber
                    value={formData.price}
                    onValueChange={(e) => setField('price', e.value ?? null)}
                    mode="decimal" minFractionDigits={2} maxFractionDigits={2} min={0}
                    suffix={` ${currency}`} placeholder="0.00"
                    className={fieldClass('price')}
                    inputStyle={{ width: '100%' }} style={{ width: '100%' }}
                  />
                  {validationErrors.price && <Message severity="error" text={validationErrors.price} style={{ marginTop: '0.25rem' }} />}
                </div>
                <div className="p-field">
                  <label className="p-label">{t('unit')}</label>
                  <Dropdown value={formData.saleUnitId} onChange={(e) => setField('saleUnitId', e.value)} options={uomOptions} placeholder="Select unit" style={{ width: '100%' }} showClear />
                </div>
                <div className="p-field">
                  <label className="p-label">{t('tax')}</label>
                  <Dropdown value={formData.saleTaxId} onChange={(e) => setField('saleTaxId', e.value)} options={taxOptions} placeholder="0%" style={{ width: '100%' }} />
                </div>
              </div>
              {priceWithTax != null && saleTaxRate > 0 && (
                <div style={{ marginTop: '0.875rem', padding: '0.625rem 0.875rem', background: '#f0fdf4', borderRadius: '0.5rem', border: '1px solid #bbf7d0' }}>
                  <span style={{ fontSize: '0.8125rem', color: '#166534' }}>
                    {t('priceWithTax')}: <strong>{formatAmount(priceWithTax, 2)} {currency}</strong>
                  </span>
                </div>
              )}

              <div style={{ marginTop: '1.25rem' }} className="p-field">
                <label className="p-label">{t('minPrice')}</label>
                <InputNumber
                  value={formData.minPrice}
                  onValueChange={(e) => setField('minPrice', e.value ?? null)}
                  mode="decimal" minFractionDigits={2} maxFractionDigits={2} min={0}
                  suffix={` ${currency}`} placeholder="0.00"
                  inputStyle={{ width: '100%' }} style={{ maxWidth: '16rem', width: '100%' }}
                />
              </div>
            </div>

            {/* Cost Price */}
            <div style={panel}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={iconBox('#eff6ff')}>
                  <TrendingUp style={{ width: '1rem', height: '1rem', color: '#235ae4' }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a' }}>{t('costPrice')}</h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>Purchase cost</p>
                </div>
              </div>
              <div className="product-pricing-grid">
                <div className="p-field">
                  <label className="p-label">{t('costPrice')}</label>
                  <InputNumber
                    value={formData.cost}
                    onValueChange={(e) => setField('cost', e.value ?? null)}
                    mode="decimal" minFractionDigits={2} maxFractionDigits={2} min={0}
                    suffix={` ${currency}`} placeholder="0.00"
                    inputStyle={{ width: '100%' }} style={{ width: '100%' }}
                  />
                </div>
                <div className="p-field">
                  <label className="p-label">{t('unit')}</label>
                  <Dropdown value={formData.purchaseUnitId} onChange={(e) => setField('purchaseUnitId', e.value)} options={uomOptions} placeholder="Select unit" style={{ width: '100%' }} showClear />
                </div>
                <div className="p-field">
                  <label className="p-label">{t('tax')}</label>
                  <Dropdown value={formData.purchaseTaxId} onChange={(e) => setField('purchaseTaxId', e.value)} options={taxOptions} placeholder="0%" style={{ width: '100%' }} />
                </div>
              </div>

              {margin != null && (
                <div style={{ marginTop: '1.25rem', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', borderRadius: '0.75rem', padding: '1rem', border: '1px solid #e2e8f0' }}>
                  <p style={{ margin: '0 0 0.75rem', fontSize: '0.6875rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Margin Analysis</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.625rem' }}>
                    {[
                      { label: t('marginAmount'), value: `${formatAmount(margin, 2)} ${currency}`, color: margin >= 0 ? '#0f172a' : '#ef4444', border: '#f1f5f9' },
                      { label: t('marginPercent'), value: `${marginPct?.toFixed(1) ?? '—'}%`, color: '#16a34a', border: '#dcfce7' },
                      { label: t('markupPercent'), value: `${markupPct?.toFixed(1) ?? '—'}%`, color: '#2563eb', border: '#dbeafe' },
                    ].map(({ label, value, color, border }) => (
                      <div key={label} style={{ background: 'white', borderRadius: '0.625rem', padding: '0.75rem 0.5rem', textAlign: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.04)', border: `1px solid ${border}` }}>
                        <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 0.375rem' }}>{label}</p>
                        <p style={{ fontSize: '1.125rem', fontWeight: 700, color, margin: 0 }}>{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </TabPanel>
        <TabPanel header={t('stock') || 'Stock'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* ── Summary KPI cards ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
              {[
                { label: t('onHand'), value: totalOnHand, icon: '📦', bg: 'linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%)', border: '#e2e8f0', color: '#0f172a' },
                { label: t('available'), value: totalAvailable, icon: '✅', bg: 'linear-gradient(135deg,#ecfdf5 0%,#d1fae5 100%)', border: '#6ee7b7', color: '#059669' },
                { label: t('reserved'), value: totalReserved, icon: '🔒', bg: 'linear-gradient(135deg,#fffbeb 0%,#fef3c7 100%)', border: '#fcd34d', color: '#d97706' },
                { label: t('incoming'), value: totalIncoming, icon: '⬇️', bg: 'linear-gradient(135deg,#eff6ff 0%,#dbeafe 100%)', border: '#93c5fd', color: '#2563eb' },
                { label: t('outgoing'), value: totalOutgoing, icon: '⬆️', bg: 'linear-gradient(135deg,#fff7ed 0%,#ffedd5 100%)', border: '#fdba74', color: '#ea580c' },
              ].map(({ label, value, icon, bg, border, color }) => (
                <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: '1rem', padding: '1.125rem 1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
                    <span style={{ fontSize: '1rem' }}>{icon}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '1.875rem', fontWeight: 800, color, lineHeight: 1, letterSpacing: '-0.03em' }}>{value.toFixed(0)}</p>
                </div>
              ))}
            </div>

            {/* ── Stock table panel ── */}
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
              {/* Panel header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '2.25rem', height: '2.25rem', borderRadius: '0.625rem', background: 'linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%)', border: '1px solid #86efac', flexShrink: 0 }}>
                    <Building2 style={{ width: '1rem', height: '1rem', color: '#16a34a' }} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a' }}>{t('stockManagement')}</h3>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>{stockQuants.length} {stockQuants.length === 1 ? 'entrepôt' : 'entrepôts'}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.625rem' }}>
                  <Button
                    onClick={() => setShowStockCorrection(true)}
                    icon={<Plus style={{ width: '0.875rem', height: '0.875rem' }} />}
                    label={t('correctStock')}
                    size="small"
                    outlined
                  />
                  <Button
                    onClick={() => setShowStockTransfer(true)}
                    icon={<ArrowRightLeft style={{ width: '0.875rem', height: '0.875rem' }} />}
                    label={t('transferStock')}
                    size="small"
                    severity="help"
                    outlined
                  />
                </div>
              </div>

              {/* DataTable */}
              <DataTable
                value={stockQuants}
                stripedRows
                showGridlines
                size="small"
                emptyMessage={
                  <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#94a3b8' }}>
                    <Building2 style={{ width: 40, height: 40, margin: '0 auto 0.75rem', opacity: 0.3 }} />
                    <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 500 }}>{t('noStockRecordsFound')}</p>
                  </div>
                }
                pt={{
                  thead: { style: { background: '#f8fafc' } },
                  table: { style: { borderRadius: 0, width: '100%' } },
                  tfoot: { style: { background: '#f1f5f9', borderTop: '2px solid #cbd5e1' } },
                }}
                footerColumnGroup={
                  <ColumnGroup>
                    <Row>
                      <Column
                        footer={<span style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('total')}</span>}
                        footerStyle={{ padding: '0.625rem 1rem' }}
                      />
                      <Column
                        footer={<span style={{ fontWeight: 800, fontSize: '0.9375rem', color: '#0f172a' }}>{totalOnHand.toFixed(2)}</span>}
                        footerStyle={{ textAlign: 'right', padding: '0.625rem 1rem' }}
                      />
                      <Column
                        footer={<span style={{ fontWeight: 800, fontSize: '0.9375rem', color: '#d97706' }}>{totalReserved.toFixed(2)}</span>}
                        footerStyle={{ textAlign: 'right', padding: '0.625rem 1rem' }}
                      />
                      <Column
                        footer={<span style={{ fontWeight: 800, fontSize: '0.9375rem', color: totalAvailable > 0 ? '#059669' : '#ef4444' }}>{totalAvailable.toFixed(2)}</span>}
                        footerStyle={{ textAlign: 'right', padding: '0.625rem 1rem' }}
                      />
                      <Column
                        footer={<span style={{ fontWeight: 800, fontSize: '0.9375rem', color: '#2563eb' }}>{totalIncoming.toFixed(2)}</span>}
                        footerStyle={{ textAlign: 'right', padding: '0.625rem 1rem' }}
                      />
                      <Column
                        footer={<span style={{ fontWeight: 800, fontSize: '0.9375rem', color: '#ea580c' }}>{totalOutgoing.toFixed(2)}</span>}
                        footerStyle={{ textAlign: 'right', padding: '0.625rem 1rem' }}
                      />
                    </Row>
                  </ColumnGroup>
                }
              >
                <Column
                  field="warehouse.name"
                  header={t('location')}
                  body={(row) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                      <div style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', flexShrink: 0, background: parseFloat(row.availableQuantity?.toString() || '0') > 0 ? '#22c55e' : '#e2e8f0' }} />
                      <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.875rem' }}>{row.warehouse?.name || t('unknown')}</span>
                    </div>
                  )}
                  headerStyle={{ padding: '0.625rem 1rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b', background: '#f8fafc' }}
                  bodyStyle={{ padding: '0.625rem 1rem', verticalAlign: 'middle' }}
                  style={{ minWidth: '11rem' }}
                />
                <Column
                  field="quantity"
                  header={t('onHand')}
                  body={(row) => (
                    <span style={{ display: 'block', textAlign: 'right', fontWeight: 700, fontSize: '0.9375rem', color: '#0f172a' }}>
                      {parseFloat(row.quantity.toString()).toFixed(2)}
                    </span>
                  )}
                  headerStyle={{ padding: '0.625rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b', background: '#f8fafc' }}
                  bodyStyle={{ padding: '0.625rem 1rem', verticalAlign: 'middle' }}
                  style={{ width: '9rem' }}
                />
                <Column
                  field="reservedQuantity"
                  header={t('reserved')}
                  body={(row) => {
                    const val = parseFloat(row.reservedQuantity?.toString() || '0');
                    return (
                      <div style={{ textAlign: 'right' }}>
                        {val > 0
                          ? <span style={{ display: 'inline-block', minWidth: '3.5rem', textAlign: 'right', fontWeight: 600, fontSize: '0.875rem', color: '#d97706', background: '#fffbeb', padding: '0.125rem 0.5rem', borderRadius: '0.375rem', border: '1px solid #fde68a' }}>{val.toFixed(2)}</span>
                          : <span style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>—</span>
                        }
                      </div>
                    );
                  }}
                  headerStyle={{ padding: '0.625rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b', background: '#f8fafc' }}
                  bodyStyle={{ padding: '0.625rem 1rem', verticalAlign: 'middle' }}
                  style={{ width: '9rem' }}
                />
                <Column
                  field="availableQuantity"
                  header={t('available')}
                  body={(row) => {
                    const val = parseFloat(row.availableQuantity?.toString() || '0');
                    return (
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ display: 'inline-block', minWidth: '3.5rem', textAlign: 'right', fontWeight: 700, fontSize: '0.875rem', color: val > 0 ? '#059669' : '#ef4444', background: val > 0 ? '#ecfdf5' : '#fef2f2', padding: '0.125rem 0.5rem', borderRadius: '0.375rem', border: `1px solid ${val > 0 ? '#bbf7d0' : '#fecaca'}` }}>
                          {val.toFixed(2)}
                        </span>
                      </div>
                    );
                  }}
                  headerStyle={{ padding: '0.625rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b', background: '#f8fafc' }}
                  bodyStyle={{ padding: '0.625rem 1rem', verticalAlign: 'middle' }}
                  style={{ width: '9rem' }}
                />
                <Column
                  field="incomingQuantity"
                  header={t('incoming')}
                  body={(row) => {
                    const val = parseFloat(row.incomingQuantity?.toString() || '0');
                    return (
                      <div style={{ textAlign: 'right' }}>
                        {val > 0
                          ? <span style={{ display: 'inline-block', minWidth: '3.5rem', textAlign: 'right', fontWeight: 600, fontSize: '0.875rem', color: '#2563eb', background: '#eff6ff', padding: '0.125rem 0.5rem', borderRadius: '0.375rem', border: '1px solid #bfdbfe' }}>{val.toFixed(2)}</span>
                          : <span style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>—</span>
                        }
                      </div>
                    );
                  }}
                  headerStyle={{ padding: '0.625rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b', background: '#f8fafc' }}
                  bodyStyle={{ padding: '0.625rem 1rem', verticalAlign: 'middle' }}
                  style={{ width: '9rem' }}
                />
                <Column
                  field="outgoingQuantity"
                  header={t('outgoing')}
                  body={(row) => {
                    const val = parseFloat(row.outgoingQuantity?.toString() || '0');
                    return (
                      <div style={{ textAlign: 'right' }}>
                        {val > 0
                          ? <span style={{ display: 'inline-block', minWidth: '3.5rem', textAlign: 'right', fontWeight: 600, fontSize: '0.875rem', color: '#ea580c', background: '#fff7ed', padding: '0.125rem 0.5rem', borderRadius: '0.375rem', border: '1px solid #fed7aa' }}>{val.toFixed(2)}</span>
                          : <span style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>—</span>
                        }
                      </div>
                    );
                  }}
                  headerStyle={{ padding: '0.625rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b', background: '#f8fafc' }}
                  bodyStyle={{ padding: '0.625rem 1rem', verticalAlign: 'middle' }}
                  style={{ width: '9rem' }}
                />
              </DataTable>
            </div>
          </div>
        </TabPanel>
      </TabView>

      {/* ── Stock Correction Dialog ── */}
      <Dialog
        visible={showStockCorrection}
        onHide={() => setShowStockCorrection(false)}
        header={t('correctStock')}
        style={{ width: '32rem' }}
        modal
        footer={
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button outlined onClick={() => setShowStockCorrection(false)} label={t('cancel')} style={{ flex: 1 }} />
            <Button
              onClick={handleStockCorrection}
              disabled={!stockCorrectionData.warehouseId || !stockCorrectionData.quantity || stockCorrectionMutation.isPending}
              loading={stockCorrectionMutation.isPending}
              label={t('validate')}
              style={{ flex: 1 }}
            />
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '0.5rem' }}>
          {warehouses.length === 0 && <Message severity="warn" text={t('noWarehouseCreateOne')} />}

          <div className="p-field">
            <label className="p-label">{t('warehouse')} *</label>
            <Dropdown
              value={stockCorrectionData.warehouseId}
              onChange={(e) => setStockCorrectionData({ ...stockCorrectionData, warehouseId: e.value })}
              options={[{ label: warehousesLoading ? t('loading') : t('selectWarehouse'), value: '' }, ...warehouseDropdownOptions]}
              disabled={warehouses.length === 0}
              style={{ width: '100%' }}
            />
          </div>

          <div className="p-field">
            <label className="p-label">Operation *</label>
            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.375rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RadioButton value="add" checked={stockCorrectionData.operation === 'add'} onChange={() => setStockCorrectionData({ ...stockCorrectionData, operation: 'add' })} />
                <span style={{ fontSize: '0.875rem' }}>{t('add')}</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RadioButton value="remove" checked={stockCorrectionData.operation === 'remove'} onChange={() => setStockCorrectionData({ ...stockCorrectionData, operation: 'remove' })} />
                <span style={{ fontSize: '0.875rem' }}>{t('remove')}</span>
              </label>
            </div>
          </div>

          <div className="p-field">
            <label className="p-label">{t('quantity')} *</label>
            <InputText type="number" min="0" value={stockCorrectionData.quantity} onChange={(e) => setStockCorrectionData({ ...stockCorrectionData, quantity: e.target.value })} style={{ width: '100%' }} />
          </div>

          <div className="p-field">
            <label className="p-label">{t('unitPrice')}</label>
            <InputText type="number" step="0.01" min="0" value={stockCorrectionData.unitPrice} onChange={(e) => setStockCorrectionData({ ...stockCorrectionData, unitPrice: e.target.value })} style={{ width: '100%' }} />
          </div>

          <div className="p-field">
            <label className="p-label">{t('notes')}</label>
            <InputText value={stockCorrectionData.notes} onChange={(e) => setStockCorrectionData({ ...stockCorrectionData, notes: e.target.value })} placeholder={`Stock correction — ${product.code || product.name}`} style={{ width: '100%' }} />
          </div>
        </div>
      </Dialog>

      {/* ── Stock Transfer Dialog ── */}
      <Dialog
        visible={showStockTransfer}
        onHide={() => setShowStockTransfer(false)}
        header={t('transferStock')}
        style={{ width: '32rem' }}
        modal
        footer={
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button outlined onClick={() => setShowStockTransfer(false)} label={t('cancel')} style={{ flex: 1 }} />
            <Button
              onClick={handleStockTransfer}
              disabled={!stockTransferData.sourceWarehouseId || !stockTransferData.destWarehouseId || !stockTransferData.quantity || stockTransferMutation.isPending}
              loading={stockTransferMutation.isPending}
              label={t('transfer')}
              style={{ flex: 1 }}
            />
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '0.5rem' }}>
          {warehouses.length === 0 && <Message severity="warn" text={t('noWarehouseCreateOne')} />}

          <div className="p-field">
            <label className="p-label">Source warehouse *</label>
            <Dropdown
              value={stockTransferData.sourceWarehouseId}
              onChange={(e) => setStockTransferData({ ...stockTransferData, sourceWarehouseId: e.value })}
              options={[{ label: warehousesLoading ? t('loading') : t('selectSourceWarehouse'), value: '' }, ...warehouseDropdownOptions]}
              disabled={warehouses.length === 0}
              style={{ width: '100%' }}
            />
          </div>

          <div className="p-field">
            <label className="p-label">Destination warehouse *</label>
            <Dropdown
              value={stockTransferData.destWarehouseId}
              onChange={(e) => setStockTransferData({ ...stockTransferData, destWarehouseId: e.value })}
              options={[{ label: warehousesLoading ? t('loading') : t('selectDestinationWarehouse'), value: '' }, ...destWarehouseOptions]}
              disabled={warehouses.length === 0}
              style={{ width: '100%' }}
            />
          </div>

          <div className="p-field">
            <label className="p-label">{t('quantity')} *</label>
            <InputText type="number" min="0" value={stockTransferData.quantity} onChange={(e) => setStockTransferData({ ...stockTransferData, quantity: e.target.value })} style={{ width: '100%' }} />
          </div>

          <div className="p-field">
            <label className="p-label">{t('notes')}</label>
            <InputText value={stockTransferData.notes} onChange={(e) => setStockTransferData({ ...stockTransferData, notes: e.target.value })} placeholder={`Stock transfer — ${product.code || product.name}`} style={{ width: '100%' }} />
          </div>
        </div>
      </Dialog>

    </AdminLayout>
  );
}
