import { Category, CreateCategoryDTO, UpdateCategoryDTO } from './categories.interface';

const API_URL = '/api';

export class CategoriesService {
  async getAll(type?: string): Promise<Category[]> {
    const url = type ? `${API_URL}/categories?type=${type}` : `${API_URL}/categories`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch categories');
    return response.json();
  }

  async getHierarchy(type?: string): Promise<Category[]> {
    const url = type 
      ? `${API_URL}/categories/hierarchy?type=${type}` 
      : `${API_URL}/categories/hierarchy`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch category hierarchy');
    return response.json();
  }

  async getByType(type: string): Promise<Category[]> {
    const response = await fetch(`${API_URL}/categories/type/${type}`);
    if (!response.ok) throw new Error('Failed to fetch categories by type');
    return response.json();
  }

  async getById(id: number): Promise<Category> {
    const response = await fetch(`${API_URL}/categories/${id}`);
    if (!response.ok) throw new Error('Failed to fetch category');
    return response.json();
  }

  async create(data: CreateCategoryDTO): Promise<Category> {
    const response = await fetch(`${API_URL}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create category');
    }
    return response.json();
  }

  async update(id: number, data: UpdateCategoryDTO): Promise<Category> {
    const response = await fetch(`${API_URL}/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update category');
    }
    return response.json();
  }

  async delete(id: number): Promise<void> {
    const response = await fetch(`${API_URL}/categories/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete category');
    }
  }
}

export const categoriesService = new CategoriesService();
