import { Partner as IPartner, PartnerFormData } from './partners.interface';

export class Partner implements IPartner {
  constructor(
    public id: number,
    public name: string,
    public isEnabled: boolean,
    public isCustomer: boolean,
    public isSupplier: boolean,
    public dueDatePeriod: number,
    public dateCreated: string,
    public dateUpdated: string,
    public isTaxExempt: boolean,
    public code?: string,
    public taxNumber?: string,
    public address?: string,
    public postalCode?: string,
    public city?: string,
    public countryId?: number,
    public email?: string,
    public phoneNumber?: string,
    public streetName?: string,
    public additionalStreetName?: string,
    public buildingNumber?: string,
    public plotIdentification?: string,
    public citySubdivisionName?: string,
    public countrySubentity?: string,
    public priceListId?: number,
    public latitude?: number,
    public longitude?: number,
    public googleMapsUrl?: string,
    public wazeUrl?: string,
    public deliveryAddress?: string,
    public totalOrders?: number,
  ) {}

  get displayName(): string {
    return this.name;
  }

  get fullAddress(): string {
    const parts = [
      this.buildingNumber,
      this.streetName,
      this.additionalStreetName,
      this.citySubdivisionName,
      this.city,
      this.postalCode,
    ].filter(Boolean);
    return parts.join(', ') || this.address || '';
  }

  get hasLocation(): boolean {
    return !!(this.latitude && this.longitude);
  }

  get hasGoogleMapsUrl(): boolean {
    return !!this.googleMapsUrl;
  }

  get hasWazeUrl(): boolean {
    return !!this.wazeUrl;
  }

  get formattedPhone(): string {
    if (!this.phoneNumber) return '';
    // Basic formatting for display
    const cleaned = this.phoneNumber.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return this.phoneNumber;
  }

  get customerType(): string {
    if (this.isCustomer && this.isSupplier) return 'Customer & Supplier';
    if (this.isCustomer) return 'Customer';
    if (this.isSupplier) return 'Supplier';
    return 'Partner';
  }

  canPlaceOrder(): boolean {
    return this.isCustomer && this.isEnabled;
  }

  hasValidEmail(): boolean {
    if (!this.email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(this.email);
  }

  hasValidPhone(): boolean {
    if (!this.phoneNumber) return false;
    const cleaned = this.phoneNumber.replace(/\D/g, '');
    return cleaned.length >= 10;
  }

  static fromApiResponse(data: Record<string, unknown>): Partner {
    return new Partner(
      data.id as number,
      data.name as string,
      data.isEnabled as boolean,
      data.isCustomer as boolean,
      data.isSupplier as boolean,
      (data.dueDatePeriod as number) || 0,
      data.dateCreated as string,
      data.dateUpdated as string,
      (data.isTaxExempt as boolean) || false,
      data.code as string | undefined,
      data.taxNumber as string | undefined,
      data.address as string | undefined,
      data.postalCode as string | undefined,
      data.city as string | undefined,
      data.countryId as number | undefined,
      data.email as string | undefined,
      data.phoneNumber as string | undefined,
      data.streetName as string | undefined,
      data.additionalStreetName as string | undefined,
      data.buildingNumber as string | undefined,
      data.plotIdentification as string | undefined,
      data.citySubdivisionName as string | undefined,
      data.countrySubentity as string | undefined,
      data.priceListId as number | undefined,
      data.latitude ? parseFloat(String(data.latitude)) : undefined,
      data.longitude ? parseFloat(String(data.longitude)) : undefined,
      data.googleMapsUrl as string | undefined,
      data.wazeUrl as string | undefined,
      data.deliveryAddress as string | undefined,
      data.totalOrders ? parseInt(String(data.totalOrders)) : undefined,
    );
  }

  toFormData(): PartnerFormData {
    return {
      phoneNumber: this.phoneNumber || '',
      name: this.name,
      email: this.email,
      address: this.address,
      city: this.city,
      postalCode: this.postalCode,
      latitude: this.latitude,
      longitude: this.longitude,
      googleMapsUrl: this.googleMapsUrl,
      wazeUrl: this.wazeUrl,
    };
  }

  toJSON(): IPartner {
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
