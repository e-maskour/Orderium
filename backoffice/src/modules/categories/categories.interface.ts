export interface ICategory {
  id: number;
  name: string;
  description?: string;
  type: string;
  parentId?: number;
  parent?: ICategory;
  children?: ICategory[];
  isActive: boolean;
  imageUrl?: string | null;
  imagePublicId?: string | null;
  dateCreated: string;
  dateUpdated: string;
}

export interface CreateCategoryDTO {
  name: string;
  description?: string;
  type: string;
  parentId?: number;
  isActive?: boolean;
  imageUrl?: string | null;
  imagePublicId?: string | null;
}

export interface UpdateCategoryDTO {
  name?: string;
  description?: string;
  type?: string;
  parentId?: number;
  isActive?: boolean;
  imageUrl?: string | null;
  imagePublicId?: string | null;
}

export interface GetCategoriesParams {
  search?: string;
  type?: string;
  page?: number;
  limit?: number;
}

export interface CategoriesPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
