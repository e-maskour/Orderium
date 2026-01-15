import { Product as IProduct, CreateProductDTO, UpdateProductDTO } from './products.interface';

export class Product implements IProduct {
  id: number;
  name: string;
  code?: string | null;
  description?: string | null;
  price: number;
  cost: number;
  stock?: number | null;
  isService: boolean;
  isEnabled: boolean;
  isPriceChangeAllowed: boolean;
  dateCreated: string;
  dateUpdated: string;
  imageUrl?: string | null;

  constructor(data: IProduct) {
    this.id = data.id;
    this.name = data.name;
    this.code = data.code;
    this.description = data.description;
    this.price = data.price;
    this.cost = data.cost;
    this.stock = data.stock;
    this.isService = data.isService;
    this.isEnabled = data.isEnabled;
    this.isPriceChangeAllowed = data.isPriceChangeAllowed;
    this.dateCreated = data.dateCreated;
    this.dateUpdated = data.dateUpdated;
    this.imageUrl = data.imageUrl;
  }

  // Getters
  get displayPrice(): string {
    return this.price.toFixed(2);
  }

  get displayCost(): string {
    return this.cost.toFixed(2);
  }

  get margin(): number {
    return this.price - this.cost;
  }

  get marginPercentage(): number {
    if (this.cost === 0) return 0;
    return ((this.margin / this.cost) * 100);
  }

  get displayMargin(): string {
    return this.margin.toFixed(2);
  }

  get displayMarginPercentage(): string {
    return `${this.marginPercentage.toFixed(1)}%`;
  }

  get hasStock(): boolean {
    return this.stock !== null && this.stock !== undefined && this.stock > 0;
  }

  get isOutOfStock(): boolean {
    return !this.isService && (this.stock === null || this.stock === 0);
  }

  get isLowStock(): boolean {
    return !this.isService && this.stock !== null && this.stock !== undefined && this.stock > 0 && this.stock < 10;
  }

  get stockStatus(): 'in-stock' | 'low-stock' | 'out-of-stock' | 'service' {
    if (this.isService) return 'service';
    if (this.isOutOfStock) return 'out-of-stock';
    if (this.isLowStock) return 'low-stock';
    return 'in-stock';
  }

  get stockStatusText(): string {
    const status = this.stockStatus;
    switch (status) {
      case 'service': return 'Service';
      case 'out-of-stock': return 'Out of Stock';
      case 'low-stock': return `Low Stock (${this.stock})`;
      case 'in-stock': return `In Stock (${this.stock})`;
      default: return 'Unknown';
    }
  }

  get productType(): string {
    return this.isService ? 'Service' : 'Product';
  }

  // Methods
  canBeSold(): boolean {
    return this.isEnabled && (this.isService || this.hasStock);
  }

  isProfitable(): boolean {
    return this.margin > 0;
  }

  calculateTotal(quantity: number): number {
    return this.price * quantity;
  }

  applyDiscount(discountPercentage: number): number {
    return this.price * (1 - discountPercentage / 100);
  }

  // Static factory method
  static fromApiResponse(data: any): Product {
    return new Product({
      id: data.id,
      name: data.name,
      code: data.code,
      description: data.description,
      price: parseFloat(data.price) || 0,
      cost: parseFloat(data.cost) || 0,
      stock: data.stock != null ? parseInt(data.stock) : null,
      isService: data.isService,
      isEnabled: data.isEnabled,
      isPriceChangeAllowed: data.isPriceChangeAllowed,
      dateCreated: data.dateCreated,
      dateUpdated: data.dateUpdated,
      imageUrl: data.imageUrl,
    });
  }

  // Convert to DTO for updates
  toUpdateDTO(): UpdateProductDTO {
    return {
      name: this.name,
      code: this.code,
      description: this.description,
      price: this.price,
      cost: this.cost,
      stock: this.stock,
      isService: this.isService,
      isEnabled: this.isEnabled,
      isPriceChangeAllowed: this.isPriceChangeAllowed,
      imageUrl: this.imageUrl,
    };
  }

  // Convert to plain object
  toJSON(): IProduct {
    return {
      id: this.id,
      name: this.name,
      code: this.code,
      description: this.description,
      price: this.price,
      cost: this.cost,
      stock: this.stock,
      isService: this.isService,
      isEnabled: this.isEnabled,
      isPriceChangeAllowed: this.isPriceChangeAllowed,
      dateCreated: this.dateCreated,
      dateUpdated: this.dateUpdated,
      imageUrl: this.imageUrl,
    };
  }
}
