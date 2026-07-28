/**
 * SearchInput — standalone search field with leading icon + clear button.
 *
 * Token-driven, RTL-aware. For tables, AppDataTable keeps its own integrated
 * search; use this for page-level / standalone search outside that wrapper.
 */
import { InputText } from 'primereact/inputtext';
import { Search, X } from 'lucide-react';
import { cx } from './cx';

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
  placeholder = 'Search…',
  onClear,
  className,
  autoFocus,
  disabled,
  ariaLabel,
}: SearchInputProps) {
  const handleClear = () => (onClear ? onClear() : onChange(''));

  return (
    <div className={cx('ui-search', className)}>
      <Search className="ui-search__icon" aria-hidden="true" />
      <InputText
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="ui-search__input"
        autoFocus={autoFocus}
        disabled={disabled}
        aria-label={ariaLabel ?? placeholder}
        type="search"
      />
      {value !== '' && !disabled && (
        <button
          type="button"
          className="ui-search__clear"
          onClick={handleClear}
          aria-label="Clear search"
        >
          <X aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export default SearchInput;
