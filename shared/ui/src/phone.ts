// Moroccan phone numbers — local format only: 10 digits starting with 05, 06 or 07.
// The international prefix (+212 / 212) is intentionally rejected so every number
// is stored the same way across apps.

export const MOROCCAN_PHONE_REGEX = /^0[5-7]\d{8}$/;
export const MOROCCAN_PHONE_MAX_LENGTH = 10;
export const MOROCCAN_PHONE_PLACEHOLDER = '06XXXXXXXX';

/** Translation keys returned by getMoroccanPhoneError — each app defines them. */
export type MoroccanPhoneErrorKey = 'phoneWithoutCountryCode' | 'invalidMoroccanPhone';

/** Keeps digits only, capped at 10 — use on every keystroke. */
export const normalizeMoroccanPhone = (value: string): string =>
  value.replace(/\D/g, '').slice(0, MOROCCAN_PHONE_MAX_LENGTH);

export const isValidMoroccanPhone = (value: string): boolean =>
  MOROCCAN_PHONE_REGEX.test(value.replace(/\D/g, ''));

/** Returns null for an empty or valid value; required-ness is checked by the caller. */
export const getMoroccanPhoneError = (value: string): MoroccanPhoneErrorKey | null => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return null;
  if (value.trim().startsWith('+') || digits.startsWith('212')) return 'phoneWithoutCountryCode';
  return MOROCCAN_PHONE_REGEX.test(digits) ? null : 'invalidMoroccanPhone';
};

/** Normalizes an input change event in place (for react-hook-form `register().onChange`). */
export const normalizePhoneInputEvent = <E extends { target: { value: string } }>(event: E): E => {
  event.target.value = normalizeMoroccanPhone(event.target.value);
  return event;
};

/** Common attributes for every phone <input>. */
export const phoneInputProps = {
  type: 'tel',
  inputMode: 'tel',
  autoComplete: 'tel',
  maxLength: MOROCCAN_PHONE_MAX_LENGTH,
  placeholder: MOROCCAN_PHONE_PLACEHOLDER,
  dir: 'ltr',
} as const;
