import type { IBrand, CreateBrandDTO, UpdateBrandDTO } from './brands.interface';

export class Brand implements IBrand {
  id: number;
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  logoPublicId?: string | null;
  website?: string | null;
  isActive: boolean;
  productCount?: number;
  dateCreated: string;
  dateUpdated: string;

  constructor(data: IBrand) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.logoUrl = data.logoUrl;
    this.logoPublicId = data.logoPublicId;
    this.website = data.website;
    this.isActive = data.isActive;
    this.productCount = data.productCount;
    this.dateCreated = data.dateCreated;
    this.dateUpdated = data.dateUpdated;
  }

  // Getters
  get displayName(): string {
    return this.name;
  }

  get hasLogo(): boolean {
    return !!this.logoUrl;
  }

  get hasProducts(): boolean {
    return (this.productCount ?? 0) > 0;
  }

  get statusText(): string {
    return this.isActive ? 'Active' : 'Inactive';
  }

  /** Two-letter monogram used when no logo is set */
  get initials(): string {
    return this.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? '')
      .join('');
  }

  // Static factory method
  static fromApiResponse(data: any): Brand {
    return new Brand({
      id: data.id,
      name: data.name,
      description: data.description ?? null,
      logoUrl: data.logoUrl ?? null,
      logoPublicId: data.logoPublicId ?? null,
      website: data.website ?? null,
      isActive: data.isActive ?? true,
      productCount: data.productCount ?? 0,
      dateCreated: data.dateCreated,
      dateUpdated: data.dateUpdated,
    });
  }

  toCreateDTO(): CreateBrandDTO {
    return {
      name: this.name,
      description: this.description,
      logoUrl: this.logoUrl,
      logoPublicId: this.logoPublicId,
      website: this.website,
      isActive: this.isActive,
    };
  }

  toUpdateDTO(): UpdateBrandDTO {
    return {
      name: this.name,
      description: this.description,
      logoUrl: this.logoUrl,
      logoPublicId: this.logoPublicId,
      website: this.website,
      isActive: this.isActive,
    };
  }

  toJSON(): IBrand {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      logoUrl: this.logoUrl,
      logoPublicId: this.logoPublicId,
      website: this.website,
      isActive: this.isActive,
      productCount: this.productCount,
      dateCreated: this.dateCreated,
      dateUpdated: this.dateUpdated,
    };
  }
}
