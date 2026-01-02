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
  DateCreated: string;
  DateUpdated: string;
  StreetName?: string;
  AdditionalStreetName?: string;
  BuildingNumber?: string;
  PlotIdentification?: string;
  CitySubdivisionName?: string;
  CountrySubentity?: string;
  IsTaxExempt: boolean;
  PriceListId?: number;
  Latitude?: number;
  Longitude?: number;
  GoogleMapsUrl?: string;
  WazeUrl?: string;
}

export interface CustomerFormData {
  PhoneNumber: string;
  Name: string;
  Email?: string;
  Address?: string;
  City?: string;
  PostalCode?: string;
  Latitude?: number;
  Longitude?: number;
  GoogleMapsUrl?: string;
  WazeUrl?: string;
}
