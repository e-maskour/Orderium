export interface IDeliveryPerson {
  id: number;
  name: string;
  phoneNumber: string;
  email: string;
  isActive: boolean;
  dateCreated: string;
  dateUpdated: string;
}

export interface CreateDeliveryPersonDTO {
  name: string;
  phoneNumber: string;
  email: string;
  password: string;
  isActive: boolean;
}

export interface UpdateDeliveryPersonDTO {
  name?: string;
  phoneNumber?: string;
  email?: string;
  isActive?: boolean;
}
