import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Controller, type UseFormReturn } from 'react-hook-form';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputNumber } from 'primereact/inputnumber';
import { InputSwitch } from 'primereact/inputswitch';
import { Button } from 'primereact/button';
import { RefreshCw } from 'lucide-react';
import { formatAmount } from '@orderium/ui';
import { useLanguage } from '../../context/LanguageContext';
import type { TranslationKey } from '../../lib/i18n';
import type { ProductFormValues } from '../../modules/products/schemas/product-form.schema';
import { FormSection } from './FormSection';
import { FormField } from './FormField';
import { FIELD_IDS } from './fields';
import { AutoCompleteSelect, AutoCompleteMultiSelect } from '../ui/AutoCompleteSelect';

export interface ProductFormOptions {
  warehouses: any[];
  taxRates: any[];
  categories: any[];
  brands: any[];
  uoms: any[];
}

interface ProductFormProps {
  mode: 'create' | 'edit';
  form: UseFormReturn<ProductFormValues>;
  options: ProductFormOptions;
  currency: string;
  isGeneratingCode: boolean;
  onRegenerateCode: () => void;
  /** Disables every control while a save is in flight. */
  saving?: boolean;
  /** Edit-only: the product image uploader, rendered inside Identity. */
  imageSlot?: ReactNode;
}

/**
 * The product form. Identical in create and edit — only the surrounding
 * page shell differs. Owns presentation only: the RHF instance, mutations
 * and navigation stay with the page.
 */
export function ProductForm({
  mode,
  form,
  options,
  currency,
  isGeneratingCode,
  onRegenerateCode,
  saving = false,
  imageSlot,
}: ProductFormProps) {
  const { t } = useLanguage();
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = form;

  const { warehouses, taxRates, categories, brands, uoms } = options;

  const price = watch('price');
  const cost = watch('cost');
  const saleTaxId = watch('saleTaxId');
  const isService = watch('isService');
  const saleUnitId = watch('saleUnitId');
  const purchaseUnitId = watch('purchaseUnitId');

  /** Translates a zod message key into the active language. */
  const err = (field: keyof ProductFormValues): string | undefined => {
    const message = errors[field]?.message;
    return message ? t(message as TranslationKey) : undefined;
  };

  const invalidClass = (field: keyof ProductFormValues) => (errors[field] ? 'p-invalid' : '');

  const warehouseOptions = useMemo(
    () => warehouses.map((w: any) => ({ label: `${w.name} (${w.code})`, value: w.id })),
    [warehouses],
  );
  const categoryOptions = useMemo(
    () => categories.map((c: any) => ({ label: c.name, value: c.id })),
    [categories],
  );
  const brandOptions = useMemo(
    () => brands.map((b: any) => ({ label: b.name, value: b.id })),
    [brands],
  );
  const uomOptions = useMemo(
    () => uoms.map((u: any) => ({ label: `${u.name} — ${u.code}`, value: u.id })),
    [uoms],
  );
  const taxOptions = useMemo(
    () => [
      { label: '0%', value: null },
      ...taxRates.map((r: any) => ({ label: `${r.name} (${r.rate}%)`, value: r.name })),
    ],
    [taxRates],
  );

  // ── Derived readouts ──
  const saleTaxRate = taxRates.find((r: any) => r.name === saleTaxId)?.rate ?? 0;
  const priceWithTax = price ? price * (1 + saleTaxRate / 100) : null;
  const margin = price != null && cost != null ? price - cost : null;
  const marginPct = margin != null && cost ? (margin / cost) * 100 : null;
  const markupPct = margin != null && price ? (margin / price) * 100 : null;

  const money = (v: number) => `${formatAmount(v, 2)} ${currency}`;

  return (
    <div className="pform-layout">
      {/* ══ Main column: the task path ══ */}
      <div className="pform-col">
        {/* ── 1. Identity ── */}
        <FormSection
          id="sec-identity"
          title={t('basicInformation')}
          description={mode === 'create' ? t('addNewProductToInventory') : t('panelBasicSubtitle')}
        >
          <div className="pform-grid pform-grid--2">
            <FormField id={FIELD_IDS.name} label={t('productName')} required error={err('name')}>
              {(a) => (
                <InputText
                  {...register('name')}
                  id={a.id}
                  aria-describedby={a.describedBy}
                  aria-invalid={a.invalid}
                  aria-required={a.required}
                  disabled={saving}
                  placeholder={t('enterProductName')}
                  className={invalidClass('name')}
                />
              )}
            </FormField>

            <FormField
              id={FIELD_IDS.code}
              label={t('productCodeEAN13')}
              help={t('eanBarcodeHint')}
              error={err('code')}
              className="pform-field--code"
            >
              {(a) => (
                <div className="pform-inline">
                  <InputText
                    {...register('code')}
                    id={a.id}
                    aria-describedby={a.describedBy}
                    aria-invalid={a.invalid}
                    disabled={saving}
                    maxLength={13}
                    placeholder={t('generateCode')}
                    className={invalidClass('code')}
                  />
                  <Button
                    type="button"
                    outlined
                    onClick={onRegenerateCode}
                    disabled={isGeneratingCode || saving}
                    aria-label={t('generateNewUniqueCode')}
                    tooltip={t('generateNewUniqueCode')}
                    tooltipOptions={{ position: 'top' }}
                    icon={
                      <RefreshCw
                        size={14}
                        className={isGeneratingCode ? 'animate-spin' : ''}
                        aria-hidden="true"
                      />
                    }
                  />
                </div>
              )}
            </FormField>

            <FormField
              id={FIELD_IDS.description}
              label={t('description')}
              error={err('description')}
            >
              {(a) => (
                <InputTextarea
                  {...register('description')}
                  id={a.id}
                  aria-describedby={a.describedBy}
                  aria-invalid={a.invalid}
                  disabled={saving}
                  rows={3}
                  autoResize
                  placeholder={t('enterProductDescription')}
                  style={{ inlineSize: '100%', resize: 'none' }}
                />
              )}
            </FormField>

            {imageSlot}

            {/* isService lives here because it gates the Stock section below */}
            <Controller
              name="isService"
              control={control}
              render={({ field }) => (
                <div className="pform-switch">
                  <div className="pform-switch__text">
                    <p className="pform-switch__label" id="pf-is-service-label">
                      {t('isService')}
                    </p>
                    <p className="pform-switch__desc" id="pf-is-service-desc">
                      {t('serviceDescription')}
                    </p>
                  </div>
                  <InputSwitch
                    checked={field.value}
                    disabled={saving}
                    onChange={(e) => field.onChange(e.value ?? false)}
                    aria-labelledby="pf-is-service-label"
                    aria-describedby="pf-is-service-desc"
                  />
                </div>
              )}
            />
          </div>
        </FormSection>

        {/* ── 2. Pricing ── */}
        <FormSection id="sec-pricing" title={t('salePrice')} description={t('panelPriceSubtitle')}>
          <div className="pform-grid pform-grid--3">
            <FormField
              id={FIELD_IDS.price}
              label={t('price')}
              required
              error={err('price')}
              className="pform-field--num"
            >
              {(a) => (
                <Controller
                  name="price"
                  control={control}
                  render={({ field }) => (
                    <InputNumber
                      inputId={a.id}
                      aria-describedby={a.describedBy}
                      aria-invalid={a.invalid}
                      aria-required={a.required}
                      disabled={saving}
                      value={field.value}
                      onValueChange={(e) => field.onChange(e.value ?? null)}
                      onBlur={field.onBlur}
                      mode="decimal"
                      minFractionDigits={2}
                      maxFractionDigits={2}
                      min={0}
                      suffix={` ${currency}`}
                      placeholder="0.00"
                      className={invalidClass('price')}
                    />
                  )}
                />
              )}
            </FormField>

            <FormField id={FIELD_IDS.saleTaxId} label={t('tax')} error={err('saleTaxId')}>
              {(a) => (
                <Controller
                  name="saleTaxId"
                  control={control}
                  render={({ field }) => (
                    <AutoCompleteSelect
                      inputId={a.id}
                      aria-describedby={a.describedBy}
                      disabled={saving}
                      value={field.value}
                      onChange={(e) => field.onChange(e.value)}
                      onBlur={field.onBlur}
                      options={taxOptions}
                      placeholder="0%"
                    />
                  )}
                />
              )}
            </FormField>

            <FormField id={FIELD_IDS.saleUnitId} label={t('unit')} error={err('saleUnitId')}>
              {(a) => (
                <Controller
                  name="saleUnitId"
                  control={control}
                  render={({ field }) => (
                    <AutoCompleteSelect
                      inputId={a.id}
                      aria-describedby={a.describedBy}
                      disabled={saving}
                      value={field.value}
                      options={uomOptions}
                      onChange={(e) => field.onChange(e.value)}
                      onBlur={field.onBlur}
                      placeholder={t('selectUnit')}
                    />
                  )}
                />
              )}
            </FormField>

            <FormField
              id={FIELD_IDS.minPrice}
              label={t('minPrice')}
              help={t('minPriceTooltip')}
              error={err('minPrice')}
              className="pform-field--num"
            >
              {(a) => (
                <Controller
                  name="minPrice"
                  control={control}
                  render={({ field }) => (
                    <InputNumber
                      inputId={a.id}
                      aria-describedby={a.describedBy}
                      aria-invalid={a.invalid}
                      disabled={saving}
                      value={field.value ?? null}
                      onValueChange={(e) => field.onChange(e.value ?? null)}
                      onBlur={field.onBlur}
                      mode="decimal"
                      minFractionDigits={2}
                      maxFractionDigits={2}
                      min={0}
                      suffix={` ${currency}`}
                      placeholder="0.00"
                      className={invalidClass('minPrice')}
                    />
                  )}
                />
              )}
            </FormField>
          </div>

          {priceWithTax != null && saleTaxRate > 0 && (
            <p className="pform-readout">
              {t('priceWithTax')}: <strong>{money(priceWithTax)}</strong>
            </p>
          )}
        </FormSection>

        {/* ── 3. Cost & purchasing ── */}
        <FormSection id="sec-cost" title={t('costPrice')} description={t('panelCostSubtitle')}>
          <div className="pform-grid pform-grid--3">
            <FormField
              id={FIELD_IDS.cost}
              label={t('costPrice')}
              error={err('cost')}
              className="pform-field--num"
            >
              {(a) => (
                <Controller
                  name="cost"
                  control={control}
                  render={({ field }) => (
                    <InputNumber
                      inputId={a.id}
                      aria-describedby={a.describedBy}
                      aria-invalid={a.invalid}
                      disabled={saving}
                      value={field.value ?? null}
                      onValueChange={(e) => field.onChange(e.value ?? null)}
                      onBlur={field.onBlur}
                      mode="decimal"
                      minFractionDigits={2}
                      maxFractionDigits={2}
                      min={0}
                      suffix={` ${currency}`}
                      placeholder="0.00"
                      className={invalidClass('cost')}
                    />
                  )}
                />
              )}
            </FormField>

            <FormField id={FIELD_IDS.purchaseTaxId} label={t('tax')} error={err('purchaseTaxId')}>
              {(a) => (
                <Controller
                  name="purchaseTaxId"
                  control={control}
                  render={({ field }) => (
                    <AutoCompleteSelect
                      inputId={a.id}
                      aria-describedby={a.describedBy}
                      disabled={saving}
                      value={field.value}
                      onChange={(e) => field.onChange(e.value)}
                      onBlur={field.onBlur}
                      options={taxOptions}
                      placeholder="0%"
                    />
                  )}
                />
              )}
            </FormField>

            <FormField
              id={FIELD_IDS.purchaseUnitId}
              label={t('unit')}
              error={err('purchaseUnitId')}
            >
              {(a) => (
                <Controller
                  name="purchaseUnitId"
                  control={control}
                  render={({ field }) => (
                    <AutoCompleteSelect
                      inputId={a.id}
                      aria-describedby={a.describedBy}
                      disabled={saving}
                      value={field.value}
                      options={uomOptions}
                      onChange={(e) => field.onChange(e.value)}
                      onBlur={field.onBlur}
                      placeholder={t('selectUnit')}
                    />
                  )}
                />
              )}
            </FormField>
          </div>

          {margin != null && (
            <div className="pform-stats">
              <p className="pform-stats__title">{t('marginAnalysis')}</p>
              <div className="pform-stats__grid">
                <div className="pform-stat">
                  <p className="pform-stat__label">{t('marginAmount')}</p>
                  <p className={`pform-stat__value${margin < 0 ? ' pform-stat__value--neg' : ''}`}>
                    {money(margin)}
                  </p>
                </div>
                <div className="pform-stat">
                  <p className="pform-stat__label">{t('marginPercent')}</p>
                  <p className="pform-stat__value">{marginPct?.toFixed(1) ?? '—'}%</p>
                </div>
                <div className="pform-stat">
                  <p className="pform-stat__label">{t('markupPercent')}</p>
                  <p className="pform-stat__value">{markupPct?.toFixed(1) ?? '—'}%</p>
                </div>
              </div>
            </div>
          )}
        </FormSection>
      </div>

      {/* ══ Rail: set-once, low-frequency fields ══ */}
      <aside className="pform-col">
        {/* ── 4. Stock & location — gated by isService ── */}
        <FormSection
          id="sec-stock"
          title={t('warehouse')}
          description={t('warehouseAndCategories')}
        >
          <div className="pform-grid">
            <FormField
              id={FIELD_IDS.warehouseId}
              label={t('warehouse')}
              required={!isService}
              /* Disabled state always states its reason in text, never colour or a tooltip alone */
              help={isService ? t('serviceDescription') : undefined}
              error={err('warehouseId')}
            >
              {(a) => (
                <Controller
                  name="warehouseId"
                  control={control}
                  render={({ field }) => (
                    <AutoCompleteSelect
                      inputId={a.id}
                      aria-describedby={a.describedBy}
                      aria-invalid={a.invalid}
                      aria-required={a.required}
                      disabled={saving || isService}
                      value={field.value}
                      onChange={(e) => field.onChange(e.value)}
                      onBlur={field.onBlur}
                      options={warehouseOptions}
                      placeholder={t('selectOrSearchWarehouse')}
                      emptyMessage={t('noWarehousesFound')}
                      className={invalidClass('warehouseId')}
                    />
                  )}
                />
              )}
            </FormField>
          </div>
        </FormSection>

        {/* ── 5. Classification ── */}
        <FormSection
          id="sec-classification"
          title={t('classification')}
          description={t('warehouseAndCategories')}
        >
          <div className="pform-grid">
            <FormField id={FIELD_IDS.brandId} label={t('brand')} error={err('brandId')}>
              {(a) => (
                <Controller
                  name="brandId"
                  control={control}
                  render={({ field }) => (
                    <AutoCompleteSelect
                      inputId={a.id}
                      aria-describedby={a.describedBy}
                      disabled={saving}
                      value={field.value ?? null}
                      onChange={(e) => field.onChange(e.value ?? null)}
                      onBlur={field.onBlur}
                      options={brandOptions}
                      placeholder={t('selectBrand')}
                      emptyMessage={t('noBrandsFound')}
                    />
                  )}
                />
              )}
            </FormField>

            <FormField
              id={FIELD_IDS.categoryIds}
              label={t('categories')}
              error={err('categoryIds')}
            >
              {(a) => (
                <Controller
                  name="categoryIds"
                  control={control}
                  render={({ field }) => (
                    <AutoCompleteMultiSelect
                      inputId={a.id}
                      aria-describedby={a.describedBy}
                      disabled={saving}
                      value={field.value}
                      onChange={(e) => field.onChange(e.value)}
                      onBlur={field.onBlur}
                      options={categoryOptions}
                      placeholder={t('typeToSearchCategories')}
                      display="chip"
                      emptyMessage={t('noCategoriesFound')}
                    />
                  )}
                />
              )}
            </FormField>
          </div>
        </FormSection>

        {/* ── 6. Settings ── */}
        <FormSection
          id="sec-settings"
          title={t('settingsSection')}
          description={t('behaviorOptions')}
        >
          {(
            [
              { key: 'isEnabled', label: t('enabled'), desc: t('enabledDescription') },
              {
                key: 'isPriceChangeAllowed',
                label: t('allowPriceChange'),
                desc: t('allowPriceChangeDescription'),
              },
            ] as const
          ).map(({ key, label, desc }) => (
            <Controller
              key={key}
              name={key}
              control={control}
              render={({ field }) => (
                <div className="pform-switch">
                  <div className="pform-switch__text">
                    <p className="pform-switch__label" id={`pf-${key}-label`}>
                      {label}
                    </p>
                    <p className="pform-switch__desc" id={`pf-${key}-desc`}>
                      {desc}
                    </p>
                  </div>
                  <InputSwitch
                    checked={field.value}
                    disabled={saving}
                    onChange={(e) => field.onChange(e.value ?? false)}
                    aria-labelledby={`pf-${key}-label`}
                    aria-describedby={`pf-${key}-desc`}
                  />
                </div>
              )}
            />
          ))}
        </FormSection>
      </aside>
    </div>
  );
}
