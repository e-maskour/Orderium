import { useMemo, type ReactNode } from 'react';
import { DecimalInput } from '@orderium/ui';
import { Controller, type UseFormReturn } from 'react-hook-form';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputSwitch } from 'primereact/inputswitch';
import { Button } from 'primereact/button';
import {
  RefreshCw,
  Info,
  DollarSign,
  Package,
  FileText,
  Image as ImageIcon,
  Save,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
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
  /** The product image uploader, rendered in the rail's image card. */
  imageSlot?: ReactNode;
  /** Save / cancel buttons, rendered in the rail's actions card. */
  actions: ReactNode;
}

/**
 * The product form. Identical in create and edit — only the surrounding
 * page shell differs. Owns presentation only: the RHF instance, mutations
 * and navigation stay with the page.
 */
export function ProductForm({
  form,
  options,
  currency,
  isGeneratingCode,
  onRegenerateCode,
  saving = false,
  imageSlot,
  actions,
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

  const statusOptions = useMemo(
    () => [
      { label: t('active'), value: true },
      { label: t('inactive'), value: false },
    ],
    [t],
  );

  const money = (v: number) => `${formatAmount(v, 2)}\u00A0${currency}`;

  /** Money input bound to a numeric form field. */
  const moneyInput = (
    name: 'price' | 'cost' | 'minPrice',
    a: { id: string; describedBy?: string; invalid: boolean; required: boolean },
  ) => (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <DecimalInput
          id={a.id}
          aria-describedby={a.describedBy}
          aria-invalid={a.invalid}
          aria-required={a.required}
          disabled={saving}
          value={field.value ?? null}
          onValueChange={(v) => field.onChange(v)}
          onBlur={field.onBlur}
          minFractionDigits={2}
          maxFractionDigits={2}
          min={0}
          suffix={currency}
          placeholder="0,00"
          className={`p-inputtext p-component ${invalidClass(name)}`}
        />
      )}
    />
  );

  /** Select bound to a scalar form field. */
  const selectInput = (
    name: 'saleTaxId' | 'purchaseTaxId' | 'saleUnitId' | 'purchaseUnitId' | 'brandId',
    a: { id: string; describedBy?: string },
    opts: { label: string; value: unknown }[],
    placeholder: string,
    emptyMessage?: string,
  ) => (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <AutoCompleteSelect
          inputId={a.id}
          aria-describedby={a.describedBy}
          disabled={saving}
          value={field.value ?? null}
          onChange={(e) => field.onChange(e.value ?? null)}
          onBlur={field.onBlur}
          options={opts}
          placeholder={placeholder}
          emptyMessage={emptyMessage}
        />
      )}
    />
  );

  const switchRow = (name: 'isService' | 'isPriceChangeAllowed', label: string, desc: string) => (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <div className="pform-switch">
          <div className="pform-switch__text">
            <p className="pform-switch__label" id={`pf-${name}-label`}>
              {label}
            </p>
            <p className="pform-switch__desc" id={`pf-${name}-desc`}>
              {desc}
            </p>
          </div>
          <InputSwitch
            checked={field.value}
            disabled={saving}
            onChange={(e) => field.onChange(e.value ?? false)}
            aria-labelledby={`pf-${name}-label`}
            aria-describedby={`pf-${name}-desc`}
          />
        </div>
      )}
    />
  );

  return (
    <>
      <p className="pform-note">
        <AlertCircle size={16} aria-hidden="true" />
        <span>
          {t('pfRequiredNoteBefore')} <span className="pform-note__star">*</span>{' '}
          {t('pfRequiredNoteAfter')}
        </span>
      </p>

      <div className="pform-layout">
        {/* ══ Main column: the task path ══ */}
        <div className="pform-col">
          {/* ── 1. Basic information ── */}
          <FormSection
            id="sec-identity"
            icon={<Info size={20} />}
            tone="blue"
            title={t('basicInformation')}
            description={t('pfBasicDesc')}
          >
            <div className="pform-grid pform-grid--2">
              <FormField
                id={FIELD_IDS.name}
                label={t('productName')}
                required
                error={err('name')}
                className="pform-field--full"
              >
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
                      maxLength={100}
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

              <FormField id={FIELD_IDS.brandId} label={t('brand')} error={err('brandId')}>
                {(a) =>
                  selectInput('brandId', a, brandOptions, t('selectBrand'), t('noBrandsFound'))
                }
              </FormField>

              <FormField
                id={FIELD_IDS.categoryIds}
                label={t('categories')}
                error={err('categoryIds')}
                className="pform-field--full"
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

              <FormField id={FIELD_IDS.saleUnitId} label={t('unit')} error={err('saleUnitId')}>
                {(a) => selectInput('saleUnitId', a, uomOptions, t('selectUnit'))}
              </FormField>

              <FormField id={FIELD_IDS.isEnabled} label={t('status')}>
                {(a) => (
                  <Controller
                    name="isEnabled"
                    control={control}
                    render={({ field }) => (
                      <AutoCompleteSelect
                        inputId={a.id}
                        aria-describedby={a.describedBy}
                        disabled={saving}
                        value={field.value}
                        onChange={(e) => field.onChange(e.value ?? true)}
                        onBlur={field.onBlur}
                        options={statusOptions}
                      />
                    )}
                  />
                )}
              </FormField>
            </div>
          </FormSection>

          {/* ── 2. Pricing ── */}
          <FormSection
            id="sec-pricing"
            icon={<DollarSign size={20} />}
            tone="green"
            title={t('pricing')}
            description={t('pfPricingDesc')}
          >
            <div className="pform-grid pform-grid--2">
              <FormField
                id={FIELD_IDS.cost}
                label={t('pfPurchasePrice')}
                error={err('cost')}
                className="pform-field--num"
              >
                {(a) => moneyInput('cost', a)}
              </FormField>

              <FormField
                id={FIELD_IDS.price}
                label={t('pfSellingPrice')}
                required
                error={err('price')}
                className="pform-field--num"
              >
                {(a) => moneyInput('price', a)}
              </FormField>

              <FormField
                id={FIELD_IDS.purchaseTaxId}
                label={t('pfPurchaseTax')}
                error={err('purchaseTaxId')}
              >
                {(a) => selectInput('purchaseTaxId', a, taxOptions, '0%')}
              </FormField>

              <FormField id={FIELD_IDS.saleTaxId} label={t('pfSaleTax')} error={err('saleTaxId')}>
                {(a) => selectInput('saleTaxId', a, taxOptions, '0%')}
              </FormField>

              <FormField
                id={FIELD_IDS.purchaseUnitId}
                label={t('pfPurchaseUnit')}
                error={err('purchaseUnitId')}
              >
                {(a) => selectInput('purchaseUnitId', a, uomOptions, t('selectUnit'))}
              </FormField>

              <FormField
                id={FIELD_IDS.minPrice}
                label={t('minPrice')}
                help={t('minPriceTooltip')}
                error={err('minPrice')}
                className="pform-field--num"
              >
                {(a) => moneyInput('minPrice', a)}
              </FormField>
            </div>

            {priceWithTax != null && saleTaxRate > 0 && (
              <p className="pform-readout">
                {t('priceWithTax')}: <strong>{money(priceWithTax)}</strong>
              </p>
            )}

            <div className="pform-switches">
              {switchRow(
                'isPriceChangeAllowed',
                t('allowPriceChange'),
                t('allowPriceChangeDescription'),
              )}
            </div>
          </FormSection>

          {/* ── 3. Description ── */}
          <FormSection
            id="sec-description"
            icon={<FileText size={20} />}
            tone="violet"
            title={t('description')}
            description={t('pfDescriptionDesc')}
          >
            <FormField
              id={FIELD_IDS.description}
              label={t('pfProductDescription')}
              error={err('description')}
            >
              {(a) => (
                <InputTextarea
                  {...register('description')}
                  id={a.id}
                  aria-describedby={a.describedBy}
                  aria-invalid={a.invalid}
                  disabled={saving}
                  rows={5}
                  placeholder={t('enterProductDescription')}
                  style={{ inlineSize: '100%' }}
                />
              )}
            </FormField>
          </FormSection>
        </div>

        {/* ══ Rail: image, inventory, actions, live profit preview ══ */}
        <aside className="pform-rail">
          {imageSlot && (
            <FormSection
              id="sec-image"
              icon={<ImageIcon size={20} />}
              tone="pink"
              title={t('productImage')}
              description={t('pfImageDesc')}
              className="pform-rail__image"
            >
              {imageSlot}
            </FormSection>
          )}

          {/* ── 3. Inventory — warehouse is gated by isService ── */}
          <FormSection
            id="sec-stock"
            className="pform-rail__inventory"
            icon={<Package size={20} />}
            tone="amber"
            title={t('pfInventoryTitle')}
            description={t('pfInventoryDesc')}
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

            <div className="pform-switches">
              {switchRow('isService', t('isService'), t('serviceDescription'))}
            </div>
          </FormSection>

          <FormSection
            id="sec-actions"
            icon={<Save size={20} />}
            tone="green"
            title={t('actions')}
            description={t('pfActionsDesc')}
            className="pform-rail__actions"
          >
            <div className="pform-actions-stack">{actions}</div>
          </FormSection>

          <section className="pform-profit pform-rail__profit" aria-labelledby="sec-profit-heading">
            <div className="pform-profit__head">
              <span className="pform-profit__icon" aria-hidden="true">
                <TrendingUp size={18} />
              </span>
              <div>
                <h2 className="pform-profit__title" id="sec-profit-heading">
                  {t('pfProfitPreview')}
                </h2>
                <p className="pform-profit__desc">{t('pfLiveCalculation')}</p>
              </div>
            </div>
            <dl className="pform-profit__rows">
              <div className="pform-profit__row">
                <dt>{t('pfPurchasePrice')}</dt>
                <dd>{money(cost ?? 0)}</dd>
              </div>
              <div className="pform-profit__row">
                <dt>{t('pfSellingPrice')}</dt>
                <dd>{money(price ?? 0)}</dd>
              </div>
              <div className="pform-profit__row pform-profit__row--total">
                <dt>{t('pfProfitMargin')}</dt>
                <dd className={margin != null && margin < 0 ? 'pform-profit__neg' : undefined}>
                  {money(margin ?? 0)}
                </dd>
              </div>
            </dl>
            {margin != null && (
              <p className="pform-profit__pcts">
                <span>
                  {t('marginPercent')}:{' '}
                  <strong>{marginPct != null ? formatAmount(marginPct, 1) : '—'}%</strong>
                </span>
                <span>
                  {t('markupPercent')}:{' '}
                  <strong>{markupPct != null ? formatAmount(markupPct, 1) : '—'}%</strong>
                </span>
              </p>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
