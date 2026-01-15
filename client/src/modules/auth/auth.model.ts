import { PortalUser as IPortalUser } from './auth.interface';

export class PortalUser implements IPortalUser {
  constructor(
    public id: number,
    public phoneNumber: string,
    public isCustomer: boolean,
    public isDelivery: boolean,
    public isAdmin: boolean,
    public fullName?: string,
    public customerId?: number,
    public customerName?: string,
    public deliveryId?: number
  ) {}

  get displayName(): string {
    return this.fullName || this.customerName || this.phoneNumber;
  }

  get hasCustomerAccess(): boolean {
    return this.isCustomer && !!this.customerId;
  }

  get hasDeliveryAccess(): boolean {
    return this.isDelivery && !!this.deliveryId;
  }

  get hasAdminAccess(): boolean {
    return this.isAdmin;
  }

  get userType(): string {
    if (this.isAdmin) return 'Admin';
    if (this.isDelivery) return 'Delivery';
    if (this.isCustomer) return 'Customer';
    return 'User';
  }

  canAccessCustomerPortal(): boolean {
    return this.isCustomer && !!this.customerId;
  }

  canAccessDeliveryPortal(): boolean {
    return this.isDelivery && !!this.deliveryId;
  }

  canAccessAdminPortal(): boolean {
    return this.isAdmin;
  }

  static fromApiResponse(data: any): PortalUser {
    return new PortalUser(
      data.id,
      data.phoneNumber,
      data.isCustomer,
      data.isDelivery,
      data.isAdmin,
      data.fullName,
      data.customerId,
      data.customerName,
      data.deliveryId
    );
  }

  toJSON(): IPortalUser {
    return {
      id: this.id,
      phoneNumber: this.phoneNumber,
      fullName: this.fullName,
      customerId: this.customerId,
      customerName: this.customerName,
      isCustomer: this.isCustomer,
      isDelivery: this.isDelivery,
      isAdmin: this.isAdmin,
      deliveryId: this.deliveryId,
    };
  }
}
