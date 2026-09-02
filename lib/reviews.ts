// Seller reviews: a buyer rates a seller 1-5 stars after a purchase (one
// review per order). Ratings are public so they can show as trust signals on
// seller profiles and flip pages. Everything degrades to empty/zero so the UI
// never breaks before the table exists or when signed out.

import { supabase } from './supabase';

export type Review = {
  id: string;
  reviewer: string;   // username, no leading @
  rating: number;
  body: string;
  time: string;       // relative, e.g. "3d"
  createdAt: string;
};

export type SellerRating = { avg: number; count: number };

function ago(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// Average rating + review count for a seller. avg is 0 when there are none.
export async function getSellerRating(sellerId: string): Promise<SellerRating> {
  if (!sellerId) return { avg: 0, count: 0 };
  const { data, error } = await supabase
    .from('reviews')
    .select('rating')
    .eq('seller_id', sellerId);
  if (error || !data || data.length === 0) return { avg: 0, count: 0 };
  const sum = data.reduce((acc: number, r: any) => acc + r.rating, 0);
  return { avg: sum / data.length, count: data.length };
}

export async function getSellerReviews(sellerId: string): Promise<Review[]> {
  if (!sellerId) return [];
  const { data, error } = await supabase
    .from('reviews')
    .select('id, rating, body, created_at, reviewer:reviewer_id(username)')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return [];
  return (data ?? []).map((r: any) => ({
    id: r.id,
    reviewer: r.reviewer?.username ?? 'someone',
    rating: r.rating,
    body: r.body ?? '',
    time: ago(r.created_at),
    createdAt: r.created_at,
  }));
}

export async function addReview(
  orderId: string,
  sellerId: string,
  rating: number,
  body: string
): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;
  if (!me) throw new Error('Sign in to leave a review.');
  const { error } = await supabase.from('reviews').insert({
    order_id: orderId,
    seller_id: sellerId,
    reviewer_id: me,
    rating,
    body: body.trim() || null,
  });
  if (error && error.code !== '23505') throw error; // ignore duplicate review
}
