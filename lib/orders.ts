// Orders (completed purchases).
//
// Real flips -> a row in the Supabase `orders` table, and the flip's status is
// flipped to 'sold' (which also drops it from the active feed). Seeded demo
// flips ('1'..'5') -> a small in-memory fallback so they stay interactive.

import { supabase } from './supabase';
import { isRealFlipId } from './ids';

export type OrderItem = {
  id: string;
  flipTitle: string;
  seller: string;
  total: number;
  time: string;
};

type LocalOrder = OrderItem & { flipId: string };

let localOrders: LocalOrder[] = [];
const listeners = new Set<() => void>();

export type NewOrder = {
  flipId: string;
  flipTitle: string;
  seller: string;
  sellerId?: string; // required for real flips
  total: number;
};

// Returns the new order's id (a real UUID for real flips, a local id otherwise)
// so the caller can offer a review of the seller right after checkout.
export async function createOrder(input: NewOrder): Promise<string> {
  if (isRealFlipId(input.flipId) && input.sellerId) {
    const { data: auth } = await supabase.auth.getUser();
    const buyerId = auth.user?.id;
    if (!buyerId) throw new Error('You must be signed in to buy.');
    const { data, error } = await supabase.from('orders').insert({
      flip_id: input.flipId,
      buyer_id: buyerId,
      seller_id: input.sellerId,
      total: input.total,
    }).select('id').single();
    if (error) throw error;
    // The flip is marked 'sold' by the on_order_created DB trigger (server-side,
    // so the buyer doesn't need write access to the seller's flip).
    return (data as { id: string }).id;
  }

  const localId = `order-${Date.now()}`;
  localOrders = [
    { id: localId, flipId: input.flipId, flipTitle: input.flipTitle, seller: input.seller, total: input.total, time: 'now' },
    ...localOrders,
  ];
  listeners.forEach(l => l());
  return localId;
}

// Orders the signed-in user has placed (DB) plus any seeded-flip purchases.
export async function getMyOrders(): Promise<OrderItem[]> {
  const local = localOrders.map(({ flipId, ...o }) => o);

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return local;

  const { data, error } = await supabase
    .from('orders')
    .select('id, total, created_at, flips:flip_id(title), seller:seller_id(username)')
    .eq('buyer_id', auth.user.id)
    .order('created_at', { ascending: false });
  if (error) return local;

  const dbItems: OrderItem[] = (data ?? []).map((o: any) => ({
    id: o.id,
    flipTitle: o.flips?.title ?? 'Flip',
    seller: o.seller?.username ? `@${o.seller.username}` : '@seller',
    total: o.total,
    time: 'recent',
  }));
  return [...local, ...dbItems];
}

// Sold-state for SEEDED flips only; real flips use their `status` column and
// simply disappear from the active feed once sold.
export function isLocalSold(flipId: string): boolean {
  return localOrders.some(o => o.flipId === flipId);
}

export function subscribeLocalOrders(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
