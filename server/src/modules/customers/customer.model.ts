export interface Customer {
  Id: number;
  Code?: string;
  Name: string;
  TaxNumber?: string;
  Address?: string;
  PostalCode?: string;
  City?: string;
  CountryId?: number;
  Email?: string;
  PhoneNumber?: string;
  IsEnabled: boolean;
  IsCustomer: boolean;
  IsSupplier: boolean;
  DueDatePeriod: number;
  DateCreated: Date;
  DateUpdated: Date;
  StreetName?: string;
  AdditionalStreetName?: string;
  BuildingNumber?: string;
  PlotIdentification?: string;
  CitySubdivisionName?: string;
  CountrySubentity?: string;
  IsTaxExempt: boolean;
  PriceListId?: number;
  // Additional fields for app
  Latitude?: number;
  Longitude?: number;
  GoogleMapsUrl?: string;
  WazeUrl?: string;
}

export interface CreateCustomerDTO {
  Name: string;
  PhoneNumber: string;
  Email?: string;
  Address?: string;
  City?: string;
  PostalCode?: string;
  Latitude?: number;
  Longitude?: number;
  GoogleMapsUrl?: string;
  WazeUrl?: string;
}

export interface UpdateCustomerDTO {
  Name?: string;
  Email?: string;
  Address?: string;
  City?: string;
  PostalCode?: string;
  Latitude?: number;
  Longitude?: number;
  GoogleMapsUrl?: string;
  WazeUrl?: string;
}
