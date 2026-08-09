export interface Brand {
  id: number;
  name: string;
  /**
   * Object-storage key or absolute URL for the brand logo, uploaded from the
   * back-office. Null when unset — the UI falls back to a placeholder.
   */
  logoUrl: string | null;
}

export interface BrandsResponse {
  brands: Brand[];
}
