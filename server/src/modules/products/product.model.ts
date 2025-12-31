export interface Product {
  Id: number;
  Name: string;
  Code: string | null;
  Description: string | null;
  Price: number;
  Cost: number;
  IsService: boolean;
  IsEnabled: boolean;
  DateCreated: Date;
  DateUpdated: Date;
}
