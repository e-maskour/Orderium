export interface Product {
  Id: number;
  Name: string;
  Code: string | null;
  Description: string | null;
  Price: number;
  Cost: number;
  Stock?: number | null;
  IsService: boolean;
  IsEnabled: boolean;
  DateCreated: Date;
  DateUpdated: Date;
  ImageUrl?: string | null;
}

export interface CreateProductDTO {
  Name: string;
  Code?: string | null;
  Description?: string | null;
  Price: number;
  Cost: number;
  Stock?: number | null;
  IsService?: boolean;
  IsEnabled?: boolean;
  ImageUrl?: string | null;
}

export interface UpdateProductDTO {
  Name?: string;
  Code?: string | null;
  Description?: string | null;
  Price?: number;
  Cost?: number;
  Stock?: number | null;
  IsService?: boolean;
  IsEnabled?: boolean;
  ImageUrl?: string | null;
}
