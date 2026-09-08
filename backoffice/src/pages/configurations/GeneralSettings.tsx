import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Keyboard, Languages, Loader2, Save, SlidersHorizontal } from 'lucide-react';
import { Button } from 'primereact/button';
import { InputSwitch } from 'primereact/inputswitch';
import { AdminLayout } from '../../components/AdminLayout';
import { PageHeader } from '../../components/PageHeader';
import { useLanguage } from '../../context/LanguageContext';
import { GENERAL_SETTINGS_QUERY_KEY } from '../../context/GeneralSettingsContextInstance';
import { toastError, toastUpdated } from '../../services/toast.service';
import { apiClient, API_ROUTES } from '../../common';
import { GENERAL_PARAMS_DEFAULTS, type GeneralParams } from '../../types/general-params.types';
import { AutoCompleteSelect } from '../../components/ui/AutoCompleteSelect';

type TranslationKey = Parameters<ReturnType<typeof useLanguage>['t']>[0];

interface ParamRowBase {
  key: keyof GeneralParams;
  icon: typeof Keyboard;
  labelKey: TranslationKey;
  descriptionKey: TranslationKey;
}

/**
 * Each general param is one row. Adding a param means adding an entry here and
 * a field to GeneralParams — the page itself needs no further change.
 */
type ParamRow =
  | (ParamRowBase & { kind: 'switch' })
  | (ParamRowBase & {
      kind: 'select';
      options: { value: string; labelKey: TranslationKey }[];
    });

const PARAM_ROWS: ParamRow[] = [
  {
    kind: 'select',
    key: 'defaultLanguage',
    icon: Languages,
    labelKey: 'generalParamDefaultLanguage',
    descriptionKey: 'generalParamDefaultLanguageDescription',
    options: [
      { value: 'ar', labelKey: 'arabic' },
      { value: 'fr', labelKey: 'french' },
    ],
  },
  {
    kind: 'switch',
    key: 'keyboardEnabled',
    icon: Keyboard,
    labelKey: 'generalParamKeyboardEnabled',
    descriptionKey: 'generalParamKeyboardEnabledDescription',
  },
];

export default function GeneralSettings() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [values, setValues] = useState<GeneralParams>(GENERAL_PARAMS_DEFAULTS);

  const { data, isLoading } = useQuery({
    queryKey: GENERAL_SETTINGS_QUERY_KEY,
    queryFn: async () => {
      const response = await apiClient.get<GeneralParams>(API_ROUTES.CONFIGURATIONS.GENERAL);
      return response.data;
    },
  });

  useEffect(() => {
    if (data) setValues({ ...GENERAL_PARAMS_DEFAULTS, ...data });
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: (next: GeneralParams) =>
      apiClient.patch(API_ROUTES.CONFIGURATIONS.GENERAL_UPDATE, next),
    onSuccess: () => {
      // Re-reads the same key the GeneralSettingsProvider watches, so the
      // change takes effect app-wide without a reload.
      queryClient.invalidateQueries({ queryKey: GENERAL_SETTINGS_QUERY_KEY });
      toastUpdated(t('generalParamsSaved'));
    },
    onError: (error: Error) => {
      toastError(error.message || t('errorSaving'));
    },
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div
          style={{
            padding: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '16rem',
          }}
        >
          <Loader2
            style={{ width: '2rem', height: '2rem', color: '#6366f1' }}
            className="animate-spin"
          />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        <PageHeader
          icon={SlidersHorizontal}
          title={t('generalParams')}
          subtitle={t('generalParamsDescription')}
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
            <Button
              onClick={() => updateMutation.mutate(values)}
              icon={
                updateMutation.isPending ? (
                  <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" />
                ) : (
                  <Save style={{ width: 16, height: 16 }} />
                )
              }
              label={t('save')}
              disabled={updateMutation.isPending}
              size="small"
            />
          }
        />

        <div
          style={{
            backgroundColor: 'var(--erp-surface)',
            borderRadius: '0.5rem',
            border: '1px solid var(--erp-border)',
            overflow: 'hidden',
          }}
        >
          {PARAM_ROWS.map((row, index) => {
            const Icon = row.icon;
            return (
              <div
                key={row.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1.25rem 1.5rem',
                  borderTop: index === 0 ? 'none' : '1px solid var(--erp-border)',
                }}
              >
                <div
                  style={{
                    width: '2.5rem',
                    height: '2.5rem',
                    borderRadius: '0.625rem',
                    background: 'var(--erp-border-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon
                    style={{ width: '1.25rem', height: '1.25rem', color: 'var(--text-label)' }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <label
                    htmlFor={row.key}
                    style={{
                      display: 'block',
                      fontSize: '0.9375rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      marginBottom: '0.125rem',
                    }}
                  >
                    {t(row.labelKey)}
                  </label>
                  <p
                    style={{
                      fontSize: '0.8125rem',
                      color: 'var(--text-label)',
                      margin: 0,
                      lineHeight: 1.5,
                    }}
                  >
                    {t(row.descriptionKey)}
                  </p>
                </div>
                {row.kind === 'switch' ? (
                  <InputSwitch
                    inputId={row.key}
                    checked={values[row.key] as boolean}
                    onChange={(e) => setValues((prev) => ({ ...prev, [row.key]: !!e.value }))}
                  />
                ) : (
                  <AutoCompleteSelect
                    inputId={row.key}
                    value={values[row.key]}
                    options={row.options.map((o) => ({ label: t(o.labelKey), value: o.value }))}
                    onChange={(e) => setValues((prev) => ({ ...prev, [row.key]: e.value }))}
                    style={{ width: '12rem', flexShrink: 0 }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
}
