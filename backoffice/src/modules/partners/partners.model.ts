import { IPartner, CreatePartnerDTO, UpdatePartnerDTO } from './partners.interface';

export class Partner implements IPartner {
  id: number;
  name: string;
  phoneNumber: string;
  email?: string | null;
  address?: string | null;
  ice?: string | null;
  if?: string | null;
  cnss?: string | null;
  rc?: string | null;
  patente?: string | null;
  tvaNumber?: string | null;
  deliveryAddress?: string | null;
  isCompany: boolean;
  latitude?: number | null;
  longitude?: number | null;
  googleMapsUrl?: string | null;
  wazeUrl?: string | null;
  isEnabled: boolean;
  isCustomer: boolean;
  isSupplier: boolean;
  dateCreated: string;
  dateUpdated: string;

  constructor(data: IPartner) {
    this.id = data.id;
    this.name = data.name;
    this.phoneNumber = data.phoneNumber;
    this.email = data.email;
    this.address = data.address;
    this.ice = data.ice;
    this.if = data.if;
    this.cnss = data.cnss;
    this.rc = data.rc;
    this.patente = data.patente;
    this.tvaNumber = data.tvaNumber;
    this.deliveryAddress = data.deliveryAddress;
    this.isCompany = data.isCompany;
    this.latitude = data.latitude;
    this.longitude = data.longitude;
    this.googleMapsUrl = data.googleMapsUrl;
    this.wazeUrl = data.wazeUrl;
    this.isEnabled = data.isEnabled;
    this.isCustomer = data.isCustomer;
    this.isSupplier = data.isSupplier;
    this.dateCreated = data.dateCreated;
    this.dateUpdated = data.dateUpdated;
  }

  // Getters
  get displayName(): string {
    return this.name;
  }

  get fullAddress(): string {
    return this.address || 'No address';
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

  get partnerType(): string {
    return this.isCompany ? 'Company' : 'Individual';
  }

  get hasBusinessIdentifiers(): boolean {
    return !!(this.ice || this.if || this.cnss || this.rc || this.patente || this.tvaNumber);
  }

  get initials(): string {
    return this.name
      .split(' ')
      .slice(0, 2)
      .map(w => w[0]?.toUpperCase() ?? '')
      .join('');
  }

  get shortAddress(): string {
    if (!this.address) return '';
    const parts = this.address.split(',');
    return parts[parts.length - 1]?.trim() ?? this.address;
  }

  get hasDeliveryAddress(): boolean {
    return !!this.deliveryAddress;
  }

  get preferredMapUrl(): string | null {
    return this.googleMapsUrl ?? this.wazeUrl ?? null;
  }

  get isBothRoles(): boolean {
    return this.isCustomer && this.isSupplier;
  }

  // Static factory method
  static fromApiResponse(data: any): Partner {
    return new Partner({
      id: data.id,
      name: data.name,
      phoneNumber: data.phoneNumber,
      email: data.email,
      address: data.address,
      ice: data.ice,
      if: data.if,
      cnss: data.cnss,
      rc: data.rc,
      patente: data.patente,
      tvaNumber: data.tvaNumber,
      deliveryAddress: data.deliveryAddress,
      isCompany: data.isCompany ?? false,
      latitude: data.latitude,
      longitude: data.longitude,
      googleMapsUrl: data.googleMapsUrl,
      wazeUrl: data.wazeUrl,
      isEnabled: data.isEnabled ?? true,
      isCustomer: data.isCustomer ?? false,
      isSupplier: data.isSupplier ?? false,
      dateCreated: data.dateCreated,
      dateUpdated: data.dateUpdated,
    });
  }

  // Convert to DTO for updates
  toUpdateDTO(): UpdatePartnerDTO {
    return {
      name: this.name,
      phoneNumber: this.phoneNumber,
      email: this.email,
      address: this.address,
      ice: this.ice,
      if: this.if,
      cnss: this.cnss,
      rc: this.rc,
      patente: this.patente,
      tvaNumber: this.tvaNumber,
      deliveryAddress: this.deliveryAddress,
      isCompany: this.isCompany,
      latitude: this.latitude,
      longitude: this.longitude,
      googleMapsUrl: this.googleMapsUrl,
      wazeUrl: this.wazeUrl,
      isEnabled: this.isEnabled,
      isCustomer: this.isCustomer,
      isSupplier: this.isSupplier,
    };
  }

  // Convert to plain object
  toJSON(): IPartner {
    return {
      id: this.id,
      name: this.name,
      phoneNumber: this.phoneNumber,
      email: this.email,
      address: this.address,
      ice: this.ice,
      if: this.if,
      cnss: this.cnss,
      rc: this.rc,
      patente: this.patente,
      tvaNumber: this.tvaNumber,
      deliveryAddress: this.deliveryAddress,
      isCompany: this.isCompany,
      latitude: this.latitude,
      longitude: this.longitude,
      googleMapsUrl: this.googleMapsUrl,
      wazeUrl: this.wazeUrl,
      isEnabled: this.isEnabled,
      isCustomer: this.isCustomer,
      isSupplier: this.isSupplier,
      dateCreated: this.dateCreated,
      dateUpdated: this.dateUpdated,
    };
  }

  toCreateDTO(): CreatePartnerDTO {
    return {
      name: this.name,
      phoneNumber: this.phoneNumber,
      email: this.email,
      address: this.address,
      ice: this.ice,
      if: this.if,
      cnss: this.cnss,
      rc: this.rc,
      patente: this.patente,
      tvaNumber: this.tvaNumber,
      deliveryAddress: this.deliveryAddress,
      isCompany: this.isCompany,
      latitude: this.latitude,
      longitude: this.longitude,
      googleMapsUrl: this.googleMapsUrl,
      wazeUrl: this.wazeUrl,
      isEnabled: this.isEnabled,
      isCustomer: this.isCustomer,
      isSupplier: this.isSupplier,
    };
  }
}
