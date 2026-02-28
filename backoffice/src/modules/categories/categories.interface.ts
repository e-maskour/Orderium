export interface ICategory {
  id: number;
  name: string;
  description?: string;
  type: string;
  parentId?: number;
  parent?: ICategory;
  children?: ICategory[];
  isActive: boolean;
  dateCreated: string;
  dateUpdated: string;
}

export interface CreateCategoryDTO {
  name: string;
  description?: string;
  type: string;
  parentId?: number;
  isActive?: boolean;
}

export interface UpdateCategoryDTO {
  name?: string;
  description?: string;
  type?: string;
  parentId?: number;
  isActive?: boolean;
}
