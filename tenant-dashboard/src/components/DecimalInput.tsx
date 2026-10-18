import { forwardRef, useEffect, useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import { formatDecimalInput, parseDecimal } from '../utils/numberFormat';

export interface DecimalInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type' | 'min' | 'max'
> {
  value: number | null | undefined;
  /** Called with the parsed number (null when empty) on every valid keystroke. */
  onValueChange: (value: number | null) => void;
  /** Digits kept after the comma while typing (default 2). Use 0 for integers. */
  maxFractionDigits?: number;
  /** Digits padded on blur, e.g. 2 turns "12" into "12,00" (default 0). */
  minFractionDigits?: number;
  min?: number;
  max?: number;
  /** Unit shown inside the field's end edge (e.g. "DH"); not part of the typed text. */
  suffix?: string;
}

/**
 * Text input for decimals in French format: shows and accepts "," as decimal
 * separator ("." typed on a numpad is converted). Never groups thousands.
 * Drop-in replacement for `type="number"` inputs and PrimeReact InputNumber;
 * pass className="p-inputtext p-component" to get PrimeReact styling.
 */
export const DecimalInput = forwardRef<HTMLInputElement, DecimalInputProps>(function DecimalInput(
  {
    value,
    onValueChange,
    maxFractionDigits = 2,
    minFractionDigits = 0,
    min,
    max,
    onBlur,
    onFocus,
    suffix,
    style,
    ...rest
  },
  ref,
) {
  const format = (v: number | null | undefined) =>
    formatDecimalInput(v, minFractionDigits, maxFractionDigits);
  const [text, setText] = useState(() => format(value));
  const [focused, setFocused] = useState(false);

  // Follow external value changes, but never rewrite what the user is typing
  useEffect(() => {
    if (!focused) setText(format(value));
    else if (parseDecimal(text) !== (value ?? null)) {
      setText(formatDecimalInput(value, 0, maxFractionDigits));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const allowNegative = min === undefined || min < 0;
  const pattern = new RegExp(
    `^${allowNegative ? '-?' : ''}\\d*${maxFractionDigits > 0 ? `(,\\d{0,${maxFractionDigits}})?` : ''}$`,
  );

  const input = (
    <input
      ref={ref}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      {...rest}
      style={suffix ? { width: '100%', ...style, paddingInlineEnd: '3rem' } : style}
      value={text}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onChange={(e) => {
        const next = e.target.value.replace(/\./g, ',').replace(/\s/g, '');
        if (!pattern.test(next)) return;
        setText(next);
        onValueChange(parseDecimal(next));
      }}
      onBlur={(e) => {
        setFocused(false);
        let num = parseDecimal(text);
        if (num !== null) {
          if (min !== undefined && num < min) num = min;
          if (max !== undefined && num > max) num = max;
          if (num !== parseDecimal(text)) onValueChange(num);
        }
        setText(format(num));
        onBlur?.(e);
      }}
    />
  );

  if (!suffix) return input;
  return (
    <span style={{ position: 'relative', display: 'block', width: '100%' }}>
      {input}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          insetInlineEnd: '0.75rem',
          top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
          color: '#64748b',
          fontSize: '0.875rem',
        }}
      >
        {suffix}
      </span>
    </span>
  );
});
