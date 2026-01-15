import { Customer as ICustomer, CreateCustomerDTO, UpdateCustomerDTO } from './customers.interface';

export class Customer implements ICustomer {
  id: number;
  code: string;
  name: string;
  taxNumber?: string | null;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  countryId?: number | null;
  email?: string | null;
  phoneNumber: string;
  isEnabled: boolean;
  isCustomer: boolean;
  isSupplier: boolean;
  dueDatePeriod?: number | null;
  dateCreated: string;
  dateUpdated: string;
  streetName?: string | null;
  additionalStreetName?: string | null;
  buildingNumber?: string | null;
  plotIdentification?: string | null;
  citySubdivisionName?: string | null;
  countrySubentity?: string | null;
  isTaxExempt: boolean;
  priceListId?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  googleMapsUrl?: string | null;
  wazeUrl?: string | null;
  totalOrders?: number;

  constructor(data: ICustomer) {
    this.id = data.id;
    this.code = data.code;
    this.name = data.name;
    this.taxNumber = data.taxNumber;
    this.address = data.address;
    this.postalCode = data.postalCode;
    this.city = data.city;
    this.countryId = data.countryId;
    this.email = data.email;
    this.phoneNumber = data.phoneNumber;
    this.isEnabled = data.isEnabled;
    this.isCustomer = data.isCustomer;
    this.isSupplier = data.isSupplier;
    this.dueDatePeriod = data.dueDatePeriod;
    this.dateCreated = data.dateCreated;
    this.dateUpdated = data.dateUpdated;
    this.streetName = data.streetName;
    this.additionalStreetName = data.additionalStreetName;
    this.buildingNumber = data.buildingNumber;
    this.plotIdentification = data.plotIdentification;
    this.citySubdivisionName = data.citySubdivisionName;
    this.countrySubentity = data.countrySubentity;
    this.isTaxExempt = data.isTaxExempt;
    this.priceListId = data.priceListId;
    this.latitude = data.latitude;
    this.longitude = data.longitude;
    this.googleMapsUrl = data.googleMapsUrl;
    this.wazeUrl = data.wazeUrl;
    this.totalOrders = data.totalOrders;
  }

  // Getters
  get displayName(): string {
    return this.name;
  }

  get fullAddress(): string {
    const parts = [
      this.streetName,
      this.buildingNumber,
      this.citySubdivisionName,
      this.city,
      this.postalCode,
    ].filter(Boolean);
    return parts.join(', ') || this.address || 'No address';
  }

  get hasLocation(): boolean {
    return this.latitude !== null && this.longitude !== null;
  }

  get statusText(): string {
    return this.isEnabled ? 'Active' : 'Inactive';
  }

  get customerType(): string {
    if (this.isCustomer && this.isSupplier) return 'Customer & Supplier';
    if (this.isCustomer) return 'Customer';
    if (this.isSupplier) return 'Supplier';
    return 'Unknown';
  }

  get hasOrders(): boolean {
    return (this.totalOrders ?? 0) > 0;
  }

  get orderCount(): number {
    return this.totalOrders ?? 0;
  }

  // Methods
  canPlaceOrder(): boolean {
    return this.isEnabled && this.isCustomer;
  }

  canSupply(): boolean {
    return this.isEnabled && this.isSupplier;
  }

  hasValidTaxNumber(): boolean {
    return !!this.taxNumber && this.taxNumber.length > 0;
  }

  hasValidEmail(): boolean {
    if (!this.email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(this.email);
  }

  hasValidPhone(): boolean {
    return !!this.phoneNumber && this.phoneNumber.length > 0;
  }

  // Static factory method
  static fromApiResponse(data: any): Customer {
    return new Customer({
      id: data.id,
      code: data.code,
      name: data.name,
      taxNumber: data.taxNumber,
      address: data.address,
      postalCode: data.postalCode,
      city: data.city,
      countryId: data.countryId,
      email: data.email,
      phoneNumber: data.phoneNumber,
      isEnabled: data.isEnabled,
      isCustomer: data.isCustomer,
      isSupplier: data.isSupplier,
      dueDatePeriod: data.dueDatePeriod,
      dateCreated: data.dateCreated,
      dateUpdated: data.dateUpdated,
      streetName: data.streetName,
      additionalStreetName: data.additionalStreetName,
      buildingNumber: data.buildingNumber,
      plotIdentification: data.plotIdentification,
      citySubdivisionName: data.citySubdivisionName,
      countrySubentity: data.countrySubentity,
      isTaxExempt: data.isTaxExempt,
      priceListId: data.priceListId,
      latitude: data.latitude,
      longitude: data.longitude,
      googleMapsUrl: data.googleMapsUrl,
      wazeUrl: data.wazeUrl,
      totalOrders: data.totalOrders,
    });
  }

  // Convert to DTO for updates
  toUpdateDTO(): UpdateCustomerDTO {
    return {
      name: this.name,
      phoneNumber: this.phoneNumber,
      email: this.email,
      address: this.address,
      taxNumber: this.taxNumber,
      city: this.city,
      postalCode: this.postalCode,
      isEnabled: this.isEnabled,
    };
  }

  // Convert to plain object
  toJSON(): ICustomer {
    return {
      id: this.id,
      code: this.code,
      name: this.name,
      taxNumber: this.taxNumber,
      address: this.address,
      postalCode: this.postalCode,
      city: this.city,
      countryId: this.countryId,
      email: this.email,
      phoneNumber: this.phoneNumber,
      isEnabled: this.isEnabled,
      isCustomer: this.isCustomer,
      isSupplier: this.isSupplier,
      dueDatePeriod: this.dueDatePeriod,
      dateCreated: this.dateCreated,
      dateUpdated: this.dateUpdated,
      streetName: this.streetName,
      additionalStreetName: this.additionalStreetName,
      buildingNumber: this.buildingNumber,
      plotIdentification: this.plotIdentification,
      citySubdivisionName: this.citySubdivisionName,
      countrySubentity: this.countrySubentity,
      isTaxExempt: this.isTaxExempt,
      priceListId: this.priceListId,
      latitude: this.latitude,
      longitude: this.longitude,
      googleMapsUrl: this.googleMapsUrl,
      wazeUrl: this.wazeUrl,
      totalOrders: this.totalOrders,
    };
  }
}
