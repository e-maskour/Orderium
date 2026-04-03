import { generateEAN13Barcode } from './codeGenerator';
import { productsService } from '../modules/products';

/**
 * Generate a unique EAN-13 barcode that doesn't exist in the database
 * Tries up to maxAttempts times to find a unique code
 */
export const generateUniqueProductCode = async (maxAttempts: number = 10): Promise<string> => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateEAN13Barcode();

    // Check if this code already exists
    const exists = await productsService.checkCodeExists(code);

    if (!exists) {
      return code;
    }

    // If code exists, add a small delay before next attempt to ensure different timestamp
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  // If all attempts failed, throw error
  throw new Error('Failed to generate unique product code after multiple attempts');
};
