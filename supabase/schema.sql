-- IzyBrd database schema
-- Run this in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- It is safe to run more than once (uses "if not exists" / "drop policy if exists").
--
-- Mirrors the app's in-memory lib/ stores:
--   profiles  <- the current user / sellers
--   flips     <- lib/listings
--   offers    <- lib/offers
--   orders    <- lib/orders
--   messages  <- chat threads

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user, auto-created on sign-up (trigger below)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text unique,
  full_name   text,
  college     text,
  major       text,
  city        text,
  bio         text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- flips: the listings ("the flip")
-- ---------------------------------------------------------------------------
create table if not exists public.flips (
  id          uuid primary key default gen_random_uuid(),
  seller_id   uuid not null references public.profiles (id) on delete cascade,
  title       text not null,
  story       text,
  price       integer not null check (price >= 0),
  style       text,
  size        text,
  condition   text,
  brand       text,
  city        text,
  image_url   text,
  status      text not null default 'active' check (status in ('active', 'sold')),
  created_at  timestamptz not null default now()
);
create index if not exists flips_seller_idx on public.flips (seller_id);
create index if not exists flips_status_idx on public.flips (status);

-- ---------------------------------------------------------------------------
-- offers: a buyer's offer on a flip
-- ---------------------------------------------------------------------------
create table if not exists public.offers (
  id          uuid primary key default gen_random_uuid(),
  flip_id     uuid not null references public.flips (id) on delete cascade,
  buyer_id    uuid not null references public.profiles (id) on delete cascade,
  amount      integer not null check (amount >= 0),
  status      text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at  timestamptz not null default now()
);
create index if not exists offers_flip_idx on public.offers (flip_id);
create index if not exists offers_buyer_idx on public.offers (buyer_id);

-- ---------------------------------------------------------------------------
-- orders: a completed purchase
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id          uuid primary key default gen_random_uuid(),
  flip_id     uuid not null references public.flips (id) on delete cascade,
  buyer_id    uuid not null references public.profiles (id) on delete cascade,
  seller_id   uuid not null references public.profiles (id) on delete cascade,
  total       integer not null check (total >= 0),
  created_at  timestamptz not null default now()
);
create index if not exists orders_buyer_idx on public.orders (buyer_id);
create index if not exists orders_seller_idx on public.orders (seller_id);

-- ---------------------------------------------------------------------------
-- messages: chat between two users, optionally about a flip
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id            uuid primary key default gen_random_uuid(),
  sender_id     uuid not null references public.profiles (id) on delete cascade,
  recipient_id  uuid not null references public.profiles (id) on delete cascade,
  flip_id       uuid references public.flips (id) on delete set null,
  body          text not null,
  created_at    timestamptz not null default now()
);
create index if not exists messages_pair_idx on public.messages (sender_id, recipient_id);

-- Enable Realtime so the chat updates live as messages arrive
alter publication supabase_realtime add table public.messages;

-- ---------------------------------------------------------------------------
-- Auto-create a profile row whenever a new auth user signs up
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, full_name, college, major)
  values (
    new.id,
    new.raw_user_meta_data ->> 'username',
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'college',
    new.raw_user_meta_data ->> 'major'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- When an order is placed, mark the flip sold. Runs server-side (security
-- definer) so the buyer doesn't need update rights on the seller's flip.
-- ---------------------------------------------------------------------------
create or replace function public.mark_flip_sold()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.flips set status = 'sold' where id = new.flip_id;
  return new;
end;
$$;

drop trigger if exists on_order_created on public.orders;
create trigger on_order_created
  after insert on public.orders
  for each row execute function public.mark_flip_sold();

-- ===========================================================================
-- Row Level Security
-- A public marketplace: everyone can read profiles and flips; you can only
-- write your own rows.
-- ===========================================================================
alter table public.profiles enable row level security;
alter table public.flips    enable row level security;
alter table public.offers   enable row level security;
alter table public.orders   enable row level security;
alter table public.messages enable row level security;

-- profiles: public read, write your own
drop policy if exists "profiles are viewable by everyone" on public.profiles;
create policy "profiles are viewable by everyone"
  on public.profiles for select using (true);

drop policy if exists "users can insert their own profile" on public.profiles;
create policy "users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "users can update their own profile" on public.profiles;
create policy "users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- flips: public read, seller writes
drop policy if exists "flips are viewable by everyone" on public.flips;
create policy "flips are viewable by everyone"
  on public.flips for select using (true);

drop policy if exists "sellers can insert their own flips" on public.flips;
create policy "sellers can insert their own flips"
  on public.flips for insert with check (auth.uid() = seller_id);

drop policy if exists "sellers can update their own flips" on public.flips;
create policy "sellers can update their own flips"
  on public.flips for update using (auth.uid() = seller_id);

-- offers: buyer creates; buyer and the flip's seller can read; seller updates status
drop policy if exists "buyer and seller can read offers" on public.offers;
create policy "buyer and seller can read offers"
  on public.offers for select using (
    auth.uid() = buyer_id
    or auth.uid() = (select seller_id from public.flips where id = flip_id)
  );

drop policy if exists "buyers can create offers" on public.offers;
create policy "buyers can create offers"
  on public.offers for insert with check (auth.uid() = buyer_id);

drop policy if exists "seller can update offer status" on public.offers;
create policy "seller can update offer status"
  on public.offers for update using (
    auth.uid() = (select seller_id from public.flips where id = flip_id)
  );

-- orders: buyer and seller can read; buyer creates
drop policy if exists "buyer and seller can read orders" on public.orders;
create policy "buyer and seller can read orders"
  on public.orders for select using (auth.uid() = buyer_id or auth.uid() = seller_id);

drop policy if exists "buyers can create orders" on public.orders;
create policy "buyers can create orders"
  on public.orders for insert with check (auth.uid() = buyer_id);

-- messages: only the two participants can read; sender creates
drop policy if exists "participants can read messages" on public.messages;
create policy "participants can read messages"
  on public.messages for select using (auth.uid() = sender_id or auth.uid() = recipient_id);

drop policy if exists "users can send messages" on public.messages;
create policy "users can send messages"
  on public.messages for insert with check (auth.uid() = sender_id);

-- ---------------------------------------------------------------------------
-- Storage bucket for listing photos
-- (You can also create this in Dashboard -> Storage -> New bucket -> "flip-photos", public.)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('flip-photos', 'flip-photos', true)
on conflict (id) do nothing;

drop policy if exists "flip photos are public" on storage.objects;
create policy "flip photos are public"
  on storage.objects for select using (bucket_id = 'flip-photos');

drop policy if exists "authenticated users can upload flip photos" on storage.objects;
create policy "authenticated users can upload flip photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'flip-photos');

-- ---------------------------------------------------------------------------
-- follows: who follows whom (one row per follower -> following pair)
-- ---------------------------------------------------------------------------
create table if not exists public.follows (
  follower_id   uuid not null references public.profiles (id) on delete cascade,
  following_id  uuid not null references public.profiles (id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (follower_id, following_id)
);

alter table public.follows enable row level security;

-- Follow relationships are public (so anyone can see counts); you can only
-- create/remove your own follows.
drop policy if exists "follows are viewable by everyone" on public.follows;
create policy "follows are viewable by everyone"
  on public.follows for select using (true);

drop policy if exists "users can follow" on public.follows;
create policy "users can follow"
  on public.follows for insert with check (auth.uid() = follower_id);

drop policy if exists "users can unfollow" on public.follows;
create policy "users can unfollow"
  on public.follows for delete using (auth.uid() = follower_id);

-- ---------------------------------------------------------------------------
-- likes: who liked which flip (public counts)
-- ---------------------------------------------------------------------------
create table if not exists public.likes (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  flip_id     uuid not null references public.flips (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, flip_id)
);
alter table public.likes enable row level security;

drop policy if exists "likes are viewable by everyone" on public.likes;
create policy "likes are viewable by everyone"
  on public.likes for select using (true);

drop policy if exists "users can like" on public.likes;
create policy "users can like"
  on public.likes for insert with check (auth.uid() = user_id);

drop policy if exists "users can unlike" on public.likes;
create policy "users can unlike"
  on public.likes for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- saves: a user's private saved flips (only the owner can see them)
-- ---------------------------------------------------------------------------
create table if not exists public.saves (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  flip_id     uuid not null references public.flips (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, flip_id)
);
alter table public.saves enable row level security;

drop policy if exists "users can read their own saves" on public.saves;
create policy "users can read their own saves"
  on public.saves for select using (auth.uid() = user_id);

drop policy if exists "users can save" on public.saves;
create policy "users can save"
  on public.saves for insert with check (auth.uid() = user_id);

drop policy if exists "users can unsave" on public.saves;
create policy "users can unsave"
  on public.saves for delete using (auth.uid() = user_id);

-- Live like counts
alter publication supabase_realtime add table public.likes;
