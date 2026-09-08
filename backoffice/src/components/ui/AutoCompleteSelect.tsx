import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { AutoComplete } from 'primereact/autocomplete';

/**
 * Project-wide selection control.
 *
 * PrimeReact's AutoComplete binds the whole option *object* and needs
 * suggestion state to work. Dropdown binds a scalar id. This wrapper keeps
 * the familiar Dropdown-shaped API (scalar `value`, `options`, `onChange`
 * with `e.value`) and renders an AutoComplete in `dropdown` mode underneath,
 * so every select in the app is one component without each call site having
 * to hand-roll suggestions, filtering and object↔id mapping.
 *
 * `forceSelection` is always on: free text can never reach the form value.
 */

interface CommonProps {
  options: any[];
  /** Key on an option holding its display text. Default `label`. */
  optionLabel?: string;
  /** Key on an option holding its bound value. Default `value`. */
  optionValue?: string;
  placeholder?: string;
  disabled?: boolean;
  inputId?: string;
  id?: string;
  className?: string;
  style?: CSSProperties;
  onBlur?: () => void;
  emptyMessage?: string;
  itemTemplate?: (option: any) => ReactNode;
  /** Marks the control required; surfaced to assistive tech. */
  required?: boolean;
  /** Styles applied to the inner <input>, not the wrapper. */
  inputStyle?: CSSProperties;
  inputClassName?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  'aria-required'?: boolean;
  'aria-label'?: string;
}

interface SingleProps extends CommonProps {
  /** The bound scalar (e.g. an id), not the option object. */
  value: any;
  onChange: (e: { value: any }) => void;
}

/** Reads the bound value off an option, tolerating primitive option lists. */
const readValue = (opt: any, key: string) =>
  opt != null && typeof opt === 'object' ? opt[key] : opt;

/** Reads the display label off an option, tolerating primitive option lists. */
const readLabel = (opt: any, key: string) =>
  opt != null && typeof opt === 'object' ? opt[key] : String(opt ?? '');

export function AutoCompleteSelect({
  value,
  options,
  onChange,
  optionLabel = 'label',
  optionValue = 'value',
  placeholder,
  disabled,
  inputId,
  id,
  className,
  style,
  onBlur,
  emptyMessage,
  itemTemplate,
  required,
  inputStyle,
  inputClassName,
  ...aria
}: SingleProps) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  // AutoComplete's own value: the option object while selected, a raw string
  // while the user is mid-type.
  const [draft, setDraft] = useState<any>(null);

  const selected = useMemo(
    () => options.find((o) => readValue(o, optionValue) === value) ?? null,
    [options, optionValue, value],
  );

  // Keep the visible text in step with the bound value (and with options
  // arriving asynchronously).
  useEffect(() => {
    setDraft(selected);
  }, [selected]);

  const search = (e: { query: string }) => {
    const q = e.query.trim().toLowerCase();
    setSuggestions(
      q ? options.filter((o) => readLabel(o, optionLabel).toLowerCase().includes(q)) : [...options],
    );
  };

  return (
    <AutoComplete
      {...aria}
      inputId={inputId ?? id}
      className={`ac-select${className ? ` ${className}` : ''}`}
      style={style}
      disabled={disabled}
      placeholder={placeholder}
      value={draft}
      suggestions={suggestions}
      completeMethod={search}
      field={optionLabel}
      itemTemplate={itemTemplate}
      emptyMessage={emptyMessage}
      aria-required={aria['aria-required'] ?? required}
      inputStyle={inputStyle}
      inputClassName={inputClassName}
      dropdown
      forceSelection
      onChange={(e) => setDraft(e.value)}
      onSelect={(e) => onChange({ value: readValue(e.value, optionValue) })}
      onClear={() => {
        setDraft(null);
        onChange({ value: null });
      }}
      onBlur={onBlur}
    />
  );
}

interface MultiProps extends CommonProps {
  /** Array of bound scalars, not option objects. */
  value: any[];
  onChange: (e: { value: any[] }) => void;
  /** Accepted for parity with MultiSelect; chips are always used. */
  display?: string;
}

/**
 * Multi-value counterpart. Mirrors MultiSelect's API (array of scalars in,
 * array of scalars out) and renders chips, on the same AutoComplete base.
 */
export function AutoCompleteMultiSelect({
  value,
  options,
  onChange,
  optionLabel = 'label',
  optionValue = 'value',
  placeholder,
  disabled,
  inputId,
  id,
  className,
  style,
  onBlur,
  emptyMessage,
  itemTemplate,
  required,
  inputStyle,
  inputClassName,
  display: _display,
  ...aria
}: MultiProps) {
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const selected = useMemo(
    () => (value ?? []).map((v) => options.find((o) => readValue(o, optionValue) === v) ?? v),
    [value, options, optionValue],
  );

  const search = (e: { query: string }) => {
    const q = e.query.trim().toLowerCase();
    const chosen = new Set(value ?? []);
    const pool = options.filter((o) => !chosen.has(readValue(o, optionValue)));
    setSuggestions(
      q ? pool.filter((o) => readLabel(o, optionLabel).toLowerCase().includes(q)) : pool,
    );
  };

  return (
    <AutoComplete
      {...aria}
      multiple
      inputId={inputId ?? id}
      className={`ac-select ac-select--multi${className ? ` ${className}` : ''}`}
      style={style}
      disabled={disabled}
      placeholder={(value ?? []).length === 0 ? placeholder : undefined}
      value={selected}
      suggestions={suggestions}
      completeMethod={search}
      field={optionLabel}
      itemTemplate={itemTemplate}
      emptyMessage={emptyMessage}
      aria-required={aria['aria-required'] ?? required}
      inputStyle={inputStyle}
      inputClassName={inputClassName}
      dropdown
      forceSelection
      onChange={(e) =>
        // Fires for chip removal as well as selection; map the whole set back
        // to scalars so callers always receive ids.
        onChange({ value: (e.value as any[]).map((o) => readValue(o, optionValue)) })
      }
      onBlur={onBlur}
    />
  );
}
