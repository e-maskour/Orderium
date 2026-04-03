// ─── POS Product (display-ready subset of Product) ───────────────────────────

export interface IPosProduct {
  id: number;
  name: string;
  description?: string;
  price: number;
  cost?: number;
  categoryId?: number;
  categories?: { id: number; name: string }[];
  imageUrl?: string;
  isEnabled?: boolean;
  isService?: boolean;
  stock?: number;
  code?: string;
  isPriceChangeAllowed?: boolean;
  saleUnitOfMeasure?: {
    id: number;
    name: string;
    code: string;
    category: string;
  };
}

// ─── POS Products Paginated Response ─────────────────────────────────────────

export interface IPosProductsResponse {
  products: IPosProduct[];
  total: number;
}

// ─── POS Customer (display-ready subset of Partner) ──────────────────────────

export interface IPosCustomer {
  id: number;
  name: string;
  phoneNumber: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

// ─── Cart Item ────────────────────────────────────────────────────────────────

export interface IPosCartItem {
  product: IPosProduct;
  quantity: number;
  discount: number;
  discountType: number; // 0 = fixed amount, 1 = percentage
}

// ─── Checkout Flow State ──────────────────────────────────────────────────────

/** Customer as passed through checkout navigation state (phone mapped for display) */
export interface ICheckoutCustomer {
  id: number;
  name: string;
  phone: string;
  address?: string;
}

export interface ICheckoutState {
  cart: IPosCartItem[];
  customer: ICheckoutCustomer;
}

export interface IOrderSuccessState {
  orderNumber: string;
  orderId: number;
  customer: ICheckoutCustomer;
  items: IPosCartItem[];
  total: number;
  paidAmount: number;
  change: number;
  orderDate: Date;
}

// ─── Create Order DTO ─────────────────────────────────────────────────────────

export interface CreatePosOrderItem {
  productId: number;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType: number;
  tax: number;
  total: number;
}

export interface CreatePosOrderDTO {
  customerId: number;
  originType?: string;
  deliveryStatus?: string;
  date?: string;
  subtotal: number;
  tax: number;
  discount: number;
  discountType: number;
  total: number;
  notes?: string;
  items: CreatePosOrderItem[];
}
