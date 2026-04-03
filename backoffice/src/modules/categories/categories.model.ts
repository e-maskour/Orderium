import { ICategory, CreateCategoryDTO, UpdateCategoryDTO } from './categories.interface';

export class Category implements ICategory {
  id: number;
  name: string;
  description?: string;
  type: string;
  parentId?: number;
  parent?: Category;
  children?: Category[];
  isActive: boolean;
  dateCreated: string;
  dateUpdated: string;

  constructor(data: ICategory) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.type = data.type;
    this.parentId = data.parentId;
    this.parent = data.parent ? new Category(data.parent) : undefined;
    this.children = data.children?.map((c) => new Category(c));
    this.isActive = data.isActive;
    this.dateCreated = data.dateCreated;
    this.dateUpdated = data.dateUpdated;
  }

  // Getters
  get displayName(): string {
    return this.name;
  }

  get isRoot(): boolean {
    return !this.parentId;
  }

  get hasChildren(): boolean {
    return !!this.children && this.children.length > 0;
  }

  get childCount(): number {
    return this.children?.length ?? 0;
  }

  get statusText(): string {
    return this.isActive ? 'Active' : 'Inactive';
  }

  get fullPath(): string {
    if (this.parent) {
      return `${this.parent.fullPath} > ${this.name}`;
    }
    return this.name;
  }

  // Static factory method
  static fromApiResponse(data: any): Category {
    return new Category({
      id: data.id,
      name: data.name,
      description: data.description,
      type: data.type,
      parentId: data.parentId,
      parent: data.parent ? Category.fromApiResponse(data.parent) : undefined,
      children: data.children?.map((c: any) => Category.fromApiResponse(c)),
      isActive: data.isActive ?? true,
      dateCreated: data.dateCreated,
      dateUpdated: data.dateUpdated,
    });
  }

  // Convert to DTO for updates
  toUpdateDTO(): UpdateCategoryDTO {
    return {
      name: this.name,
      description: this.description,
      type: this.type,
      parentId: this.parentId,
      isActive: this.isActive,
    };
  }

  toCreateDTO(): CreateCategoryDTO {
    return {
      name: this.name,
      description: this.description,
      type: this.type,
      parentId: this.parentId,
      isActive: this.isActive,
    };
  }

  toJSON(): ICategory {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      type: this.type,
      parentId: this.parentId,
      parent: this.parent?.toJSON(),
      children: this.children?.map((c) => c.toJSON()),
      isActive: this.isActive,
      dateCreated: this.dateCreated,
      dateUpdated: this.dateUpdated,
    };
  }
}
