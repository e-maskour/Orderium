export interface IBrand {
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
}

export interface CreateBrandDTO {
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  logoPublicId?: string | null;
  website?: string | null;
  isActive?: boolean;
}

export interface UpdateBrandDTO {
  name?: string;
  description?: string | null;
  logoUrl?: string | null;
  logoPublicId?: string | null;
  website?: string | null;
  isActive?: boolean;
}
