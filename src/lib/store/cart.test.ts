import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from './cart';

const mockItem = {
  eventId: 'evt_1',
  eventTitle: 'Neon Nights',
  ticketTypeId: 'tkt_1',
  ticketName: 'VIP',
  price: 150,
};

describe('Cart Zustand Store', () => {
  beforeEach(() => {
    useCartStore.getState().clearCart();
  });

  // ─── addItem ────────────────────────────────────────────────────────────────

  it('adds a new item with the given quantity', () => {
    useCartStore.getState().addItem({ ...mockItem, quantity: 2 });

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0].quantity).toBe(2);
  });

  it('adds a new item with quantity 1 when no quantity is provided', () => {
    useCartStore.getState().addItem(mockItem);

    expect(useCartStore.getState().items[0].quantity).toBe(1);
  });

  it('replaces quantity (not accumulates) when the same ticket is added with an explicit quantity', () => {
    // TicketSelector always passes an absolute desired quantity, not a delta.
    useCartStore.getState().addItem({ ...mockItem, quantity: 1 });
    useCartStore.getState().addItem({ ...mockItem, quantity: 3 });

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1); // still one entry
    expect(state.items[0].quantity).toBe(3); // replaced, not accumulated
  });

  it('increments quantity by 1 when the same ticket is added without an explicit quantity', () => {
    useCartStore.getState().addItem({ ...mockItem, quantity: 2 });
    useCartStore.getState().addItem(mockItem); // no quantity → increment

    expect(useCartStore.getState().items[0].quantity).toBe(3);
  });

  it('expiresAt is null after adding (locks are only set after /api/reserve succeeds)', () => {
    useCartStore.getState().addItem({ ...mockItem, quantity: 2 });

    expect(useCartStore.getState().expiresAt).toBeNull();
  });

  it('invalidates an active reservation when the cart is modified', () => {
    useCartStore.getState().addItem({ ...mockItem, quantity: 1 });
    useCartStore.getState().setExpiresAt(Date.now() + 600_000); // simulate locked state

    // Any modification should clear the expiry (reservation is no longer valid)
    useCartStore.getState().addItem({ ...mockItem, quantity: 2 });
    expect(useCartStore.getState().expiresAt).toBeNull();
  });

  // ─── removeItem ─────────────────────────────────────────────────────────────

  it('removes a specific ticket type from the cart', () => {
    useCartStore.getState().addItem({ ...mockItem, quantity: 2 });
    useCartStore.getState().removeItem('tkt_1');

    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('clears expiresAt after removing the last item', () => {
    useCartStore.getState().addItem({ ...mockItem, quantity: 2 });
    useCartStore.getState().setExpiresAt(Date.now() + 600_000);
    useCartStore.getState().removeItem('tkt_1');

    expect(useCartStore.getState().expiresAt).toBeNull();
  });

  // ─── updateQuantity ─────────────────────────────────────────────────────────

  it('updateQuantity sets an exact quantity', () => {
    useCartStore.getState().addItem({ ...mockItem, quantity: 1 });
    useCartStore.getState().updateQuantity('tkt_1', 5);

    expect(useCartStore.getState().items[0].quantity).toBe(5);
  });

  it('updateQuantity with 0 removes the item entirely', () => {
    useCartStore.getState().addItem({ ...mockItem, quantity: 1 });
    useCartStore.getState().updateQuantity('tkt_1', 0);

    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('updateQuantity resets expiresAt', () => {
    useCartStore.getState().addItem({ ...mockItem, quantity: 1 });
    useCartStore.getState().setExpiresAt(Date.now() + 600_000);
    useCartStore.getState().updateQuantity('tkt_1', 3);

    expect(useCartStore.getState().expiresAt).toBeNull();
  });

  // ─── clearCart ──────────────────────────────────────────────────────────────

  it('clearCart empties all items and resets expiresAt', () => {
    useCartStore.getState().addItem({ ...mockItem, quantity: 2 });
    useCartStore.getState().setExpiresAt(Date.now() + 600_000);
    useCartStore.getState().clearCart();

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(0);
    expect(state.expiresAt).toBeNull();
  });

  // ─── getCartTotal / getCartCount ─────────────────────────────────────────────

  it('getCartTotal sums price × quantity across all items', () => {
    // tkt_1: price 100 × qty 2 = 200
    // tkt_2: price 150 (mockItem default) × qty 1 = 150  →  total = 350
    useCartStore.getState().addItem({ ...mockItem, ticketTypeId: 'tkt_1', price: 100, quantity: 2 });
    useCartStore.getState().addItem({ ...mockItem, ticketTypeId: 'tkt_2', quantity: 1 });

    expect(useCartStore.getState().getCartTotal()).toBe(350);
  });

  it('getCartCount sums quantities across all items', () => {
    useCartStore.getState().addItem({ ...mockItem, ticketTypeId: 'tkt_1', price: 100, quantity: 2 });
    useCartStore.getState().addItem({ ...mockItem, ticketTypeId: 'tkt_2', price: 250, quantity: 3 });

    expect(useCartStore.getState().getCartCount()).toBe(5);
  });

  it('getCartTotal returns 0 for an empty cart', () => {
    expect(useCartStore.getState().getCartTotal()).toBe(0);
  });

  // ─── setExpiresAt ────────────────────────────────────────────────────────────

  it('setExpiresAt stores the timestamp', () => {
    const future = Date.now() + 600_000;
    useCartStore.getState().setExpiresAt(future);

    expect(useCartStore.getState().expiresAt).toBe(future);
  });

  it('setExpiresAt(null) clears the timestamp', () => {
    useCartStore.getState().setExpiresAt(Date.now() + 600_000);
    useCartStore.getState().setExpiresAt(null);

    expect(useCartStore.getState().expiresAt).toBeNull();
  });
});
