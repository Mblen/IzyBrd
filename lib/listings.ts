// In-memory store for flips the user creates from the Sell form.
// Same pattern as lib/offers.ts and lib/orders.ts - resets on reload
// until there is a backend. Shape is rich enough that both the profile
// grid and the flip detail screen can render a created listing.

export type Listing = {
  id: string;
  title: string;
  price: number;
  story: string;
  style: string;
  size: string;
  condition: string;
  brand: string;
  city: string;
  image: string; // first photo uri, or '' if none
  color: string; // fallback background for grid cells
  seller: string;
  rating: number;
  reviews: number;
};

let listings: Listing[] = [];
const listeners = new Set<() => void>();

export function addListing(
  listing: Omit<Listing, 'id' | 'color' | 'seller' | 'rating' | 'reviews'>
): string {
  const id = `listing-${Date.now()}`;
  listings = [
    {
      ...listing,
      id,
      color: '#1a1a1a',
      seller: '@mariaBrd', // current user (matches profile)
      rating: 0,
      reviews: 0,
    },
    ...listings,
  ];
  listeners.forEach((l) => l());
  return id;
}

export function getListings(): Listing[] {
  return listings;
}

export function getListing(id: string): Listing | undefined {
  return listings.find((l) => l.id === id);
}

export function subscribeListings(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
