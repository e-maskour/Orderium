/**
 * Calculate EAN-13 check digit
 * Algorithm: Sum of (odd position digits * 1 + even position digits * 3) mod 10, then 10 - result
 */
const calculateEAN13CheckDigit = (code12: string): string => {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(code12[i]);
    // Odd positions (1st, 3rd, 5th...) get multiplied by 1
    // Even positions (2nd, 4th, 6th...) get multiplied by 3
    sum += digit * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit.toString();
};

/**
 * Generate a valid EAN-13 barcode for Moroccan products
 * Format: 611XXXXXXXXX (13 digits total)
 * - First 3 digits: 611 (Morocco country code)
 * - Next 9 digits: company/product identifier (timestamp + random)
 * - Last digit: check digit (calculated)
 */
export const generateEAN13Barcode = (): string => {
  const countryCode = '611'; // Morocco

  // Generate 9 random digits for product identifier
  const timestamp = Date.now().toString().slice(-6); // 6 digits from timestamp
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0'); // 3 random digits

  const code12 = countryCode + timestamp + random;
  const checkDigit = calculateEAN13CheckDigit(code12);

  return code12 + checkDigit;
};

/**
 * Validate if a string is a valid EAN-13 code
 */
export const isValidEAN13 = (code: string): boolean => {
  if (code.length !== 13 || !/^\d{13}$/.test(code)) {
    return false;
  }

  const checkDigit = code[12];
  const calculatedCheckDigit = calculateEAN13CheckDigit(code.substring(0, 12));

  return checkDigit === calculatedCheckDigit;
};

/**
 * Generate a simple sequential-style code
 * Format: PXXXXXX (P + 6 digit number based on timestamp)
 */
export const generateSimpleCode = (): string => {
  const timestamp = Date.now().toString().slice(-6);
  return `P${timestamp}`;
};

/**
 * Default code generator - uses EAN-13 for Moroccan products
 */
export const generateDefaultProductCode = generateEAN13Barcode;
