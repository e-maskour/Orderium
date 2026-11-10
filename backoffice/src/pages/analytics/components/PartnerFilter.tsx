import React, { useEffect, useState } from 'react';
import { AutoCompleteSelect } from '../../../components/ui/AutoCompleteSelect';
import { partnersService } from '../../../modules/partners/partners.service';
import { useLanguage } from '../../../context/LanguageContext';

interface PartnerFilterProps {
  type: 'customer' | 'supplier';
  value?: number;
  onChange: (partnerId: number | undefined) => void;
}

interface Option {
  value: number;
  label: string;
}

/** Customer / supplier picker for statement reports (filters by `partnerId`). */
const PartnerFilter: React.FC<PartnerFilterProps> = ({ type, value, onChange }) => {
  const { t } = useLanguage();
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    partnersService
      .getAll({ type, limit: 1000 })
      .then(({ partners }) => {
        if (!alive) return;
        setOptions(
          partners
            .map((p) => ({
              value: p.id,
              label: p.phoneNumber ? `${p.name} — ${p.phoneNumber}` : p.name,
            }))
            .sort((a, b) => a.label.localeCompare(b.label)),
        );
      })
      .catch(() => alive && setOptions([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [type]);

  const label = type === 'customer' ? t('analyticsSelectCustomer') : t('analyticsSelectSupplier');

  return (
    <div className="ax-partner-filter">
      <span className="ax-filters__label">
        {type === 'customer' ? t('customer') : t('supplier')}
      </span>
      <AutoCompleteSelect
        value={value ?? null}
        options={options}
        onChange={(e) => onChange(e.value == null ? undefined : Number(e.value))}
        placeholder={loading ? t('analyticsLoading') : label}
        disabled={loading}
        aria-label={label}
        className="ax-partner-filter__input"
      />
    </div>
  );
};

export default PartnerFilter;
