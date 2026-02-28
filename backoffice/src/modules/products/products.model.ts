import { IProduct, CreateProductDTO, UpdateProductDTO } from './products.interface';

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
  minPrice: number;
  dateCreated: string;
  dateUpdated: string;
  imageUrl?: string | null;
  categories?: any[];
  saleUnit?: string;
  purchaseUnit?: string;
  saleUnitId?: number | null;
  purchaseUnitId?: number | null;
  saleUnitOfMeasure?: any;
  purchaseUnitOfMeasure?: any;
  saleTax?: number;
  purchaseTax?: number;
  warehouseId?: number | null;
  warehouse?: any;

  constructor(data: IProduct & { categories?: any[], saleUnit?: string, purchaseUnit?: string, saleUnitId?: number | null, purchaseUnitId?: number | null, saleUnitOfMeasure?: any, purchaseUnitOfMeasure?: any, saleTax?: number, purchaseTax?: number, warehouseId?: number | null, warehouse?: any }) {
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
    this.minPrice = data.minPrice;
    this.dateCreated = data.dateCreated;
    this.dateUpdated = data.dateUpdated;
    this.imageUrl = data.imageUrl;
    this.categories = data.categories;
    this.saleUnit = data.saleUnit;
    this.purchaseUnit = data.purchaseUnit;
    this.saleUnitId = data.saleUnitId;
    this.purchaseUnitId = data.purchaseUnitId;
    this.saleUnitOfMeasure = data.saleUnitOfMeasure;
    this.purchaseUnitOfMeasure = data.purchaseUnitOfMeasure;
    this.saleTax = data.saleTax;
    this.purchaseTax = data.purchaseTax;
    this.warehouseId = data.warehouseId;
    this.warehouse = data.warehouse;
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

  get priceWithTax(): number {
    return this.price * (1 + (this.saleTax ?? 0) / 100);
  }

  get hasImage(): boolean {
    return !!this.imageUrl;
  }

  get hasCategories(): boolean {
    return Array.isArray(this.categories) && this.categories.length > 0;
  }

  get categoryNames(): string[] {
    if (!Array.isArray(this.categories)) return [];
    return this.categories.map((c: any) => c.name ?? c);
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
      minPrice: parseFloat(data.minPrice) || 0,
      dateCreated: data.dateCreated,
      dateUpdated: data.dateUpdated,
      imageUrl: data.imageUrl,
      categories: data.categories || [],
      saleUnit: data.saleUnit,
      purchaseUnit: data.purchaseUnit,
      saleUnitId: data.saleUnitId,
      purchaseUnitId: data.purchaseUnitId,
      saleUnitOfMeasure: data.saleUnitOfMeasure,
      purchaseUnitOfMeasure: data.purchaseUnitOfMeasure,
      saleTax: data.saleTax ? parseFloat(data.saleTax) : undefined,
      purchaseTax: data.purchaseTax ? parseFloat(data.purchaseTax) : undefined,
      warehouseId: data.warehouseId,
      warehouse: data.warehouse,
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
      minPrice: this.minPrice,
      imageUrl: this.imageUrl,
    };
  }

  toCreateDTO(): CreateProductDTO {
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
      minPrice: this.minPrice,
      imageUrl: this.imageUrl,
      saleTax: this.saleTax,
      purchaseTax: this.purchaseTax,
      warehouseId: this.warehouseId,
      saleUnit: this.saleUnit,
      purchaseUnit: this.purchaseUnit,
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
      minPrice: this.minPrice,
      dateCreated: this.dateCreated,
      dateUpdated: this.dateUpdated,
      imageUrl: this.imageUrl,
    };
  }
}
