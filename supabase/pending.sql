-- ---------------------------------------------------------------------------
-- Pending changes to apply in Supabase -> SQL Editor -> Run.
-- Safe to run more than once.
--
-- Part 1 fixes account creation failing when a username is already taken.
-- Part 2 stops one signed-in user from overwriting another user's photos.
-- Both are already in schema.sql; this file is just the not-yet-applied part.
-- ---------------------------------------------------------------------------


-- ---------------------------------------------------------------------------
-- 1. Creating a profile must never block the signup itself
-- ---------------------------------------------------------------------------
-- Usernames are unique, so a taken handle used to fail the whole account
-- creation with a raw constraint error. Now we settle on a free variant
-- (maria, maria1, maria2 ...) and fall back to a bare profile row if anything
-- else goes wrong. An account with no profile details beats a failed signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  base_handle text;
  handle      text;
  n           int := 0;
begin
  base_handle := nullif(trim(new.raw_user_meta_data ->> 'username'), '');
  if base_handle is null then
    base_handle := split_part(coalesce(new.email, ''), '@', 1);
  end if;
  base_handle := regexp_replace(lower(base_handle), '[^a-z0-9_]', '', 'g');
  if base_handle = '' then
    base_handle := 'user';
  end if;

  handle := base_handle;
  while exists (select 1 from public.profiles where username = handle) loop
    n := n + 1;
    handle := base_handle || n::text;
  end loop;

  insert into public.profiles (id, username, full_name, college, major)
  values (
    new.id,
    handle,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'college',
    new.raw_user_meta_data ->> 'major'
  );
  return new;
exception when others then
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ---------------------------------------------------------------------------
-- 2. Confine photo uploads to a folder named after the uploader
-- ---------------------------------------------------------------------------
-- Without this, any signed-in user can write to any path in the bucket, which
-- means overwriting someone else's listing photos. The app already builds
-- every path as "<user id>/..." (see lib/flips.ts, lib/profile.ts,
-- lib/wardrobe.ts), so these policies just enforce what the app already does.

drop policy if exists "flip photos are public" on storage.objects;
create policy "flip photos are public"
  on storage.objects for select using (bucket_id = 'flip-photos');

drop policy if exists "authenticated users can upload flip photos" on storage.objects;
create policy "authenticated users can upload flip photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'flip-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users manage their own flip photos" on storage.objects;
create policy "users manage their own flip photos"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'flip-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users can delete their own flip photos" on storage.objects;
create policy "users can delete their own flip photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'flip-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
