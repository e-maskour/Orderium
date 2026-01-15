import { DeliveryPerson as IDeliveryPerson, CreateDeliveryPersonDTO, UpdateDeliveryPersonDTO } from './delivery.interface';

export class DeliveryPerson implements IDeliveryPerson {
  id: number;
  name: string;
  phoneNumber: string;
  email: string;
  isActive: boolean;
  dateCreated: string;
  dateUpdated: string;

  constructor(data: IDeliveryPerson) {
    this.id = data.id;
    this.name = data.name;
    this.phoneNumber = data.phoneNumber;
    this.email = data.email;
    this.isActive = data.isActive;
    this.dateCreated = data.dateCreated;
    this.dateUpdated = data.dateUpdated;
  }

  // Getters
  get displayName(): string {
    return this.name;
  }

  get statusText(): string {
    return this.isActive ? 'Active' : 'Inactive';
  }

  get formattedPhone(): string {
    // Format phone number if needed
    return this.phoneNumber;
  }

  // Methods
  isCurrentlyActive(): boolean {
    return this.isActive;
  }

  canBeAssigned(): boolean {
    return this.isActive;
  }

  // Static factory method
  static fromApiResponse(data: any): DeliveryPerson {
    return new DeliveryPerson({
      id: data.id,
      name: data.name,
      phoneNumber: data.phoneNumber,
      email: data.email,
      isActive: data.isActive,
      dateCreated: data.dateCreated,
      dateUpdated: data.dateUpdated,
    });
  }

  // Convert to DTO for updates
  toUpdateDTO(): UpdateDeliveryPersonDTO {
    return {
      name: this.name,
      phoneNumber: this.phoneNumber,
      email: this.email,
      isActive: this.isActive,
    };
  }
}
