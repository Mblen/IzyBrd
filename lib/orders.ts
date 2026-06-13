// In-memory store so completed purchases show up in the Inbox Orders tab.
// Same pattern as lib/offers.ts - resets on reload until there is a backend.

export type Order = {
  id: string;
  flipId: string;
  flipTitle: string;
  seller: string;
  total: number;
  time: string;
};

let orders: Order[] = [];
const listeners = new Set<() => void>();

export function addOrder(order: Omit<Order, 'id' | 'time'>) {
  orders = [
    { ...order, id: `order-${Date.now()}`, time: 'now' },
    ...orders,
  ];
  listeners.forEach((l) => l());
}

export function getOrders(): Order[] {
  return orders;
}

// A flip counts as sold once it has been purchased
export function isSold(flipId: string): boolean {
  return orders.some((o) => o.flipId === flipId);
}

export function subscribeOrders(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
