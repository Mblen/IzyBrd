// Offers a buyer makes on a flip.
//
// Real flips -> a row in the Supabase `offers` table. Seeded demo flips
// ('1'..'5') -> a small in-memory fallback so they stay interactive.

import { supabase } from './supabase';
import { isRealFlipId } from './ids';

export type OfferItem = {
  id: string;
  flipTitle: string;
  seller: string;
  amount: number;
  time: string;
};

type LocalOffer = OfferItem & { flipId: string };

let localOffers: LocalOffer[] = [];
const listeners = new Set<() => void>();

export type NewOffer = {
  flipId: string;
  flipTitle: string;
  seller: string;
  amount: number;
};

export async function addOffer(input: NewOffer): Promise<void> {
  if (isRealFlipId(input.flipId)) {
    const { data: auth } = await supabase.auth.getUser();
    const buyerId = auth.user?.id;
    if (!buyerId) throw new Error('You must be signed in to make an offer.');
    const { error } = await supabase.from('offers').insert({
      flip_id: input.flipId,
      buyer_id: buyerId,
      amount: input.amount,
    });
    if (error) throw error;
    return;
  }

  localOffers = [
    { id: `offer-${Date.now()}`, flipId: input.flipId, flipTitle: input.flipTitle, seller: input.seller, amount: input.amount, time: 'now' },
    ...localOffers,
  ];
  listeners.forEach(l => l());
}

// Offers the signed-in user has sent (DB) plus any on seeded flips.
export async function getMyOffers(): Promise<OfferItem[]> {
  const local = localOffers.map(({ flipId, ...o }) => o);

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return local;

  const { data, error } = await supabase
    .from('offers')
    .select('id, amount, created_at, flips:flip_id(title, seller:seller_id(username))')
    .eq('buyer_id', auth.user.id)
    .order('created_at', { ascending: false });
  if (error) return local;

  const dbItems: OfferItem[] = (data ?? []).map((o: any) => ({
    id: o.id,
    flipTitle: o.flips?.title ?? 'Flip',
    seller: o.flips?.seller?.username ? `@${o.flips.seller.username}` : '@seller',
    amount: o.amount,
    time: 'recent',
  }));
  return [...local, ...dbItems];
}

export function subscribeLocalOffers(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
