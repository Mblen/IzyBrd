// Tiny in-memory store so offers sent from a flip detail show up in the Inbox.
// No persistence yet - resets on app reload, same as the rest of the mock data.

export type Offer = {
  id: string;
  flipId: string;
  flipTitle: string;
  seller: string;
  amount: number;
  time: string;
  status: 'pending';
};

let offers: Offer[] = [];
const listeners = new Set<() => void>();

export function addOffer(offer: Omit<Offer, 'id' | 'time' | 'status'>) {
  offers = [
    { ...offer, id: `offer-${Date.now()}`, time: 'now', status: 'pending' },
    ...offers,
  ];
  listeners.forEach((l) => l());
}

export function getOffers(): Offer[] {
  return offers;
}

export function subscribeOffers(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
