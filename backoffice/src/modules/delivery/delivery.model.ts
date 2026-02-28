import { IDeliveryPerson, CreateDeliveryPersonDTO, UpdateDeliveryPersonDTO } from './delivery.interface';

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

  get displayName(): string {
    return this.name;
  }

  get statusText(): string {
    return this.isActive ? 'Active' : 'Inactive';
  }

  get initials(): string {
    return this.name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  get hasValidEmail(): boolean {
    if (!this.email) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email);
  }

  get hasValidPhone(): boolean {
    return !!this.phoneNumber && this.phoneNumber.length > 0;
  }

  canBeAssigned(): boolean {
    return this.isActive;
  }

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

  toUpdateDTO(): UpdateDeliveryPersonDTO {
    return {
      name: this.name,
      phoneNumber: this.phoneNumber,
      email: this.email,
      isActive: this.isActive,
    };
  }

  toCreateDTO(password: string): CreateDeliveryPersonDTO {
    return {
      name: this.name,
      phoneNumber: this.phoneNumber,
      email: this.email,
      password,
      isActive: this.isActive,
    };
  }

  toJSON(): IDeliveryPerson {
    return {
      id: this.id,
      name: this.name,
      phoneNumber: this.phoneNumber,
      email: this.email,
      isActive: this.isActive,
      dateCreated: this.dateCreated,
      dateUpdated: this.dateUpdated,
    };
  }
}
