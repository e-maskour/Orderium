export interface ProductFormData {
  name: string;
  code: string;
  description: string;
  price: string;
  cost: string;
  minPrice: string;
  saleTax: string;
  purchaseTax: string;
  saleUnit: string;
  purchaseUnit: string;
  categoryIds: number[];
  warehouseId: string;
  isService: boolean;
  isEnabled: boolean;
  isPriceChangeAllowed: boolean;
}

export interface ValidationErrors {
  [key: string]: string;
}

export const validateProductForm = (formData: ProductFormData, isCreating: boolean = false): ValidationErrors => {
  const errors: ValidationErrors = {};

  // Name validation
  if (!formData.name.trim()) {
    errors.name = 'Product name is required';
  } else if (formData.name.trim().length < 2) {
    errors.name = 'Product name must be at least 2 characters';
  } else if (formData.name.trim().length > 255) {
    errors.name = 'Product name must not exceed 255 characters';
  }

  // Code validation (optional but if provided must be valid)
  if (formData.code && formData.code.trim().length > 100) {
    errors.code = 'Product code must not exceed 100 characters';
  }

  // Description validation (optional)
  if (formData.description && formData.description.trim().length > 1000) {
    errors.description = 'Description must not exceed 1000 characters';
  }

  // Price validation
  if (!formData.price || formData.price.trim() === '') {
    errors.price = 'Sale price is required';
  } else {
    const priceValue = parseFloat(formData.price);
    if (isNaN(priceValue)) {
      errors.price = 'Sale price must be a valid number';
    } else if (priceValue < 0) {
      errors.price = 'Sale price cannot be negative';
    } else if (priceValue === 0) {
      errors.price = 'Sale price must be greater than 0';
    } else if (priceValue > 999999999.99) {
      errors.price = 'Sale price is too large';
    }
  }

  // Cost validation (optional)
  if (formData.cost && formData.cost.trim() !== '') {
    const costValue = parseFloat(formData.cost);
    if (isNaN(costValue)) {
      errors.cost = 'Cost must be a valid number';
    } else if (costValue < 0) {
      errors.cost = 'Cost cannot be negative';
    } else if (costValue > 999999999.99) {
      errors.cost = 'Cost is too large';
    }
  }

  // Min price validation
  if (formData.minPrice && formData.minPrice.trim() !== '') {
    const minPriceValue = parseFloat(formData.minPrice);
    const priceValue = parseFloat(formData.price);
    
    if (isNaN(minPriceValue)) {
      errors.minPrice = 'Minimum price must be a valid number';
    } else if (minPriceValue < 0) {
      errors.minPrice = 'Minimum price cannot be negative';
    } else if (!isNaN(priceValue) && minPriceValue > priceValue) {
      errors.minPrice = 'Minimum price cannot be greater than sale price';
    } else if (minPriceValue > 999999999.99) {
      errors.minPrice = 'Minimum price is too large';
    }
  }

  // Sale tax validation
  if (formData.saleTax && formData.saleTax.trim() !== '') {
    const saleTaxValue = parseFloat(formData.saleTax);
    if (isNaN(saleTaxValue)) {
      errors.saleTax = 'Sale tax must be a valid number';
    } else if (saleTaxValue < 0) {
      errors.saleTax = 'Sale tax cannot be negative';
    } else if (saleTaxValue > 100) {
      errors.saleTax = 'Sale tax cannot exceed 100%';
    }
  }

  // Purchase tax validation
  if (formData.purchaseTax && formData.purchaseTax.trim() !== '') {
    const purchaseTaxValue = parseFloat(formData.purchaseTax);
    if (isNaN(purchaseTaxValue)) {
      errors.purchaseTax = 'Purchase tax must be a valid number';
    } else if (purchaseTaxValue < 0) {
      errors.purchaseTax = 'Purchase tax cannot be negative';
    } else if (purchaseTaxValue > 100) {
      errors.purchaseTax = 'Purchase tax cannot exceed 100%';
    }
  }

  // UOM validation (required)
  if (!formData.saleUnit || formData.saleUnit.trim() === '') {
    errors.saleUnit = 'Sale unit of measure is required';
  }

  if (!formData.purchaseUnit || formData.purchaseUnit.trim() === '') {
    errors.purchaseUnit = 'Purchase unit of measure is required';
  }

  // Warehouse validation (required for non-service products)
  if (!formData.isService) {
    if (!formData.warehouseId || formData.warehouseId.trim() === '') {
      errors.warehouseId = 'Warehouse is required for products';
    } else {
      const warehouseIdValue = parseInt(formData.warehouseId);
      if (isNaN(warehouseIdValue) || warehouseIdValue <= 0) {
        errors.warehouseId = 'Please select a valid warehouse';
      }
    }
  }

  // Category validation (at least one category recommended but not required)
  // Uncomment if you want to make categories required:
  // if (!formData.categoryIds || formData.categoryIds.length === 0) {
  //   errors.categoryIds = 'At least one category is required';
  // }

  // Business logic validations
  if (!errors.price && formData.cost && formData.cost.trim() !== '') {
    const priceValue = parseFloat(formData.price);
    const costValue = parseFloat(formData.cost);
    
    if (!isNaN(costValue) && costValue > priceValue) {
      errors.cost = 'Warning: Cost is higher than sale price (negative margin)';
    }
  }

  return errors;
};

// Helper function to check if there are any errors
export const hasValidationErrors = (errors: ValidationErrors): boolean => {
  return Object.keys(errors).length > 0;
};

// Helper function to get first error message
export const getFirstError = (errors: ValidationErrors): string | null => {
  const keys = Object.keys(errors);
  return keys.length > 0 ? errors[keys[0]] : null;
};

// Field-specific validators for real-time validation
export const validateName = (name: string): string | null => {
  if (!name.trim()) return 'Product name is required';
  if (name.trim().length < 2) return 'Product name must be at least 2 characters';
  if (name.trim().length > 255) return 'Product name must not exceed 255 characters';
  return null;
};

export const validatePrice = (price: string): string | null => {
  if (!price || price.trim() === '') return 'Sale price is required';
  const value = parseFloat(price);
  if (isNaN(value)) return 'Sale price must be a valid number';
  if (value < 0) return 'Sale price cannot be negative';
  if (value === 0) return 'Sale price must be greater than 0';
  if (value > 999999999.99) return 'Sale price is too large';
  return null;
};

export const validateCost = (cost: string): string | null => {
  if (!cost || cost.trim() === '') return null; // Cost is optional
  const value = parseFloat(cost);
  if (isNaN(value)) return 'Cost must be a valid number';
  if (value < 0) return 'Cost cannot be negative';
  if (value > 999999999.99) return 'Cost is too large';
  return null;
};
