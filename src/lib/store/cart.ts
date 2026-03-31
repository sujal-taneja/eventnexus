import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  eventId: string;
  eventTitle: string;
  ticketTypeId: string;
  ticketName: string;
  price: number;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  expiresAt: number | null; // Unix timestamp
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  setExpiresAt: (time: number | null) => void;
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (ticketTypeId: string) => void;
  updateQuantity: (ticketTypeId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      expiresAt: null,
      isOpen: false,
      setIsOpen: (isOpen) => set({ isOpen }),
      setExpiresAt: (time) => set({ expiresAt: time }),

      addItem: (item) => {
        const { items } = get();
        const existing = items.find((i) => i.ticketTypeId === item.ticketTypeId);
        
        if (existing) {
          set({
            items: items.map((i) =>
              i.ticketTypeId === item.ticketTypeId
                ? { ...i, quantity: item.quantity ?? i.quantity + 1 }
                : i
            ),
            expiresAt: null // Modifying cart breaks the active lock
          });
        } else {
          set({
            items: [...items, { ...item, quantity: item.quantity ?? 1 }],
            expiresAt: null
          });
        }
      },

      removeItem: (ticketTypeId) => {
        set({
          items: get().items.filter((i) => i.ticketTypeId !== ticketTypeId),
          expiresAt: null
        });
      },

      updateQuantity: (ticketTypeId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(ticketTypeId);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.ticketTypeId === ticketTypeId ? { ...i, quantity } : i
          ),
          expiresAt: null
        });
      },

      clearCart: () => set({ items: [], expiresAt: null }),

      getCartTotal: () => {
        return get().items.reduce((total, item) => total + item.price * item.quantity, 0);
      },

      getCartCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      },
    }),
    {
      name: 'eventnexus-cart',
    }
  )
);
