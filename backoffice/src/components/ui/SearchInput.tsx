/**
 * SearchInput — standalone search field with leading icon + clear button.
 *
 * Token-driven, RTL-aware. For tables, AppDataTable keeps its own integrated
 * search; use this for page-level / standalone search outside that wrapper.
 */
import { InputText } from 'primereact/inputtext';
import { Search, X } from 'lucide-react';
import { cx } from './cx';
import { useLanguage } from '../../context/LanguageContext';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Custom clear handler. Defaults to clearing the value. */
  onClear?: () => void;
  className?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  onClear,
  className,
  autoFocus,
  disabled,
  ariaLabel,
}: SearchInputProps) {
  const { t } = useLanguage();
  const resolvedPlaceholder = placeholder ?? t('searchPlaceholderDefault');
  const handleClear = () => (onClear ? onClear() : onChange(''));

  return (
    <div className={cx('ui-search', className)}>
      <Search className="ui-search__icon" aria-hidden="true" />
      <InputText
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={resolvedPlaceholder}
        className="ui-search__input"
        autoFocus={autoFocus}
        disabled={disabled}
        aria-label={ariaLabel ?? resolvedPlaceholder}
        type="search"
      />
      {value !== '' && !disabled && (
        <button
          type="button"
          className="ui-search__clear"
          onClick={handleClear}
          aria-label={t('clearSearch')}
        >
          <X aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export default SearchInput;
