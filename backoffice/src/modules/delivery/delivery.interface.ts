export interface IDeliveryPerson {
  id: number;
  name: string;
  phoneNumber: string;
  email?: string | null;
  isActive: boolean;
  dateCreated: string;
  dateUpdated: string;
}

// `email` is nullable on the way out as well as in: the form sends `null` to
// clear it, and the API's `@IsOptional()` accepts null alongside undefined.
export interface CreateDeliveryPersonDTO {
  name: string;
  phoneNumber: string;
  email?: string | null;
  password: string;
  isActive: boolean;
}

export interface UpdateDeliveryPersonDTO {
  name?: string;
  phoneNumber?: string;
  email?: string | null;
  isActive?: boolean;
}
