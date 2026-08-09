import { Brand as IBrand } from './brands.interface';

export class Brand implements IBrand {
  constructor(
    public id: number,
    public name: string,
    public logoUrl: string | null = null,
  ) {}

  static fromApiResponse(data: Record<string, unknown>): Brand {
    return new Brand(
      data.id as number,
      (data.name as string) ?? '',
      (data.logoUrl as string | null) ?? null,
    );
  }

  toJSON(): IBrand {
    return { id: this.id, name: this.name, logoUrl: this.logoUrl };
  }
}
