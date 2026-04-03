import { IPosCartItem } from './pos.interface';

export class PosCart {
  private _items: IPosCartItem[];

  constructor(items: IPosCartItem[] = []) {
    this._items = [...items];
  }

  get items(): IPosCartItem[] {
    return this._items;
  }

  get itemCount(): number {
    return this._items.reduce((sum, item) => sum + item.quantity, 0);
  }

  get lineCount(): number {
    return this._items.length;
  }

  get isEmpty(): boolean {
    return this._items.length === 0;
  }

  get subtotal(): number {
    return this._items.reduce((sum, item) => {
      const lineTotal = item.product.price * item.quantity;
      const discount = item.discountType === 1 ? (lineTotal * item.discount) / 100 : item.discount;
      return sum + (lineTotal - discount);
    }, 0);
  }

  get total(): number {
    return this.subtotal;
  }

  get discountTotal(): number {
    return this._items.reduce((sum, item) => {
      const lineTotal = item.product.price * item.quantity;
      const discount = item.discountType === 1 ? (lineTotal * item.discount) / 100 : item.discount;
      return sum + discount;
    }, 0);
  }

  hasItem(productId: number): boolean {
    return this._items.some((i) => i.product.id === productId);
  }

  getItem(productId: number): IPosCartItem | undefined {
    return this._items.find((i) => i.product.id === productId);
  }

  addItem(item: IPosCartItem): PosCart {
    const existing = this._items.findIndex((i) => i.product.id === item.product.id);
    if (existing >= 0) {
      const updated = [...this._items];
      updated[existing] = {
        ...updated[existing],
        quantity: updated[existing].quantity + item.quantity,
      };
      return new PosCart(updated);
    }
    return new PosCart([...this._items, item]);
  }

  updateItem(productId: number, updates: Partial<IPosCartItem>): PosCart {
    return new PosCart(
      this._items.map((item) => (item.product.id === productId ? { ...item, ...updates } : item)),
    );
  }

  removeItem(productId: number): PosCart {
    return new PosCart(this._items.filter((item) => item.product.id !== productId));
  }

  clear(): PosCart {
    return new PosCart([]);
  }

  toJSON() {
    return {
      items: this._items,
      itemCount: this.itemCount,
      lineCount: this.lineCount,
      subtotal: this.subtotal,
      total: this.total,
    };
  }
}
