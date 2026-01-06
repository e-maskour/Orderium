/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { Product } from '@/types/database';

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartData {
  items: CartItem[];
  expiresAt: number; // Timestamp
}

const CART_STORAGE_KEY = 'orderium_cart';
const CART_EXPIRY_DAYS = 7;

// Helper functions for localStorage
const saveCartToStorage = (items: CartItem[]) => {
  const expiresAt = Date.now() + CART_EXPIRY_DAYS * 24 * 60 * 60 * 1000; // 7 days
  const cartData: CartData = { items, expiresAt };
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartData));
};

const loadCartFromStorage = (): CartItem[] => {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (!stored) return [];

    const cartData: CartData = JSON.parse(stored);
    
    // Check if cart has expired
    if (Date.now() > cartData.expiresAt) {
      localStorage.removeItem(CART_STORAGE_KEY);
      return [];
    }

    return cartData.items || [];
  } catch (error) {
    console.error('Failed to load cart from storage:', error);
    return [];
  }
};

const clearCartStorage = () => {
  localStorage.removeItem(CART_STORAGE_KEY);
};

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  getItemQuantity: (productId: number) => number;
  subtotal: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    // Initialize from localStorage on mount
    return loadCartFromStorage();
  });

  // Save to localStorage whenever items change
  useEffect(() => {
    if (items.length > 0) {
      saveCartToStorage(items);
    } else {
      clearCartStorage();
    }
  }, [items]);

  const addItem = useCallback((product: Product, quantity = 1) => {
    // Prevent adding out of stock products
    if (product.Stock !== undefined && product.Stock <= 0) {
      console.warn('Cannot add out of stock product to cart');
      return;
    }
    
    setItems(prev => {
      const existing = prev.find(item => item.product.Id === product.Id);
      if (existing) {
        // Check stock limit when updating quantity
        const newQuantity = existing.quantity + quantity;
        const maxStock = product.Stock ?? 999;
        const finalQuantity = Math.min(newQuantity, maxStock);
        
        return prev.map(item =>
          item.product.Id === product.Id
            ? { ...item, quantity: finalQuantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });
  }, []);

  const removeItem = useCallback((productId: number) => {
    setItems(prev => prev.filter(item => item.product.Id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    
    setItems(prev =>
      prev.map(item => {
        if (item.product.Id === productId) {
          // Check stock limit
          const maxStock = item.product.Stock ?? 999;
          const finalQuantity = Math.min(quantity, maxStock);
          return { ...item, quantity: finalQuantity };
        }
        return item;
      })
    );
  }, [removeItem]);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const getItemQuantity = useCallback((productId: number): number => {
    const item = items.find(item => item.product.Id === productId);
    return item?.quantity || 0;
  }, [items]);

  const subtotal = items.reduce(
    (sum, item) => sum + item.product.Price * item.quantity,
    0
  );

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        getItemQuantity,
        subtotal,
        itemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
