import { Product as IProduct } from './products.interface';

export class Product implements IProduct {
  constructor(
    public id: number,
    public name: string,
    public price: number,
    public cost: number,
    public isService: boolean,
    public isEnabled: boolean,
    public dateCreated: string,
    public dateUpdated: string,
    public code: string | null = null,
    public description: string | null = null,
    public stock?: number | null,
    public isPriceChangeAllowed?: boolean,
    public imageUrl?: string,
    public saleUnitOfMeasure?: {
      id: number;
      name: string;
      code: string;
      category: string;
    },
    public categories?: { id: number; name: string }[]
  ) { }

  get displayPrice(): string {
    return `$${this.price.toFixed(2)}`;
  }

  get displayCost(): string {
    return `$${this.cost.toFixed(2)}`;
  }

  get margin(): number {
    return this.price - this.cost;
  }

  get marginPercentage(): number {
    if (this.cost === 0) return 0;
    return ((this.price - this.cost) / this.cost) * 100;
  }

  get displayMargin(): string {
    return `$${this.margin.toFixed(2)}`;
  }

  get displayMarginPercentage(): string {
    return `${this.marginPercentage.toFixed(1)}%`;
  }

  get hasStock(): boolean {
    return !this.isService && this.stock !== null && this.stock !== undefined && this.stock > 0;
  }

  get isOutOfStock(): boolean {
    return !this.isService && (this.stock === null || this.stock === undefined || this.stock <= 0);
  }

  get isLowStock(): boolean {
    return !this.isService && this.stock !== null && this.stock !== undefined && this.stock > 0 && this.stock < 10;
  }

  get stockStatus(): string {
    if (this.isService) return 'Service';
    if (this.isOutOfStock) return 'Out of Stock';
    if (this.isLowStock) return 'Low Stock';
    return 'In Stock';
  }

  get stockQuantity(): string {
    if (this.isService) return 'N/A';
    if (this.stock === null || this.stock === undefined) return 'Unknown';
    return this.stock.toString();
  }

  canBeSold(): boolean {
    return this.isEnabled && (this.isService || this.hasStock);
  }

  isProfitable(): boolean {
    return this.margin > 0;
  }

  calculateTotal(quantity: number, discount = 0): number {
    const subtotal = this.price * quantity;
    return subtotal - discount;
  }

  applyDiscount(discountPercentage: number): number {
    return this.price * (1 - discountPercentage / 100);
  }

  static fromApiResponse(data: Record<string, unknown>): Product {
    const uom = data.saleUnitOfMeasure as Record<string, unknown> | undefined;
    return new Product(
      data.id as number,
      data.name as string,
      parseFloat(String(data.price)) || 0,
      parseFloat(String(data.cost)) || 0,
      (data.isService as boolean) || false,
      data.isEnabled !== false,
      data.dateCreated as string,
      data.dateUpdated as string,
      (data.code as string) || null,
      (data.description as string) || null,
      data.stock !== undefined ? (data.stock !== null ? parseInt(String(data.stock)) : null) : undefined,
      data.isPriceChangeAllowed as boolean | undefined,
      data.imageUrl as string | undefined,
      uom ? {
        id: uom.id as number,
        name: uom.name as string,
        code: uom.code as string,
        category: uom.category as string
      } : undefined,
      Array.isArray(data.categories)
        ? (data.categories as Record<string, unknown>[]).map((c) => ({ id: c.id as number, name: c.name as string }))
        : undefined
    );
  }

  toJSON(): IProduct {
    return {
      id: this.id,
      name: this.name,
      code: this.code,
      description: this.description,
      price: this.price,
      cost: this.cost,
      isService: this.isService,
      isEnabled: this.isEnabled,
      dateCreated: this.dateCreated,
      dateUpdated: this.dateUpdated,
      stock: this.stock,
      isPriceChangeAllowed: this.isPriceChangeAllowed,
      imageUrl: this.imageUrl,
      saleUnitOfMeasure: this.saleUnitOfMeasure,
      categories: this.categories,
    };
  }
}
