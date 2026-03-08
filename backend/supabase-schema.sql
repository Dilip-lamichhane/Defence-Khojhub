create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  clerk_id text unique not null,
  email text not null,
  role text not null default 'user' check (role in ('admin', 'shopowner', 'user')),
  created_at timestamp with time zone default now()
);

create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.users(id) on delete set null,
  name text not null,
  latitude numeric not null,
  longitude numeric not null,
  email text,
  phone text,
  pan_number text,
  approved_at timestamp with time zone,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'suspended'))
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  description text,
  price numeric not null,
  image_url text,
  status text not null default 'active' check (status in ('active', 'hidden'))
);

create index if not exists shops_owner_id_idx on public.shops (owner_id);
create index if not exists shops_status_idx on public.shops (status);
create index if not exists products_shop_id_idx on public.products (shop_id);
create index if not exists products_status_idx on public.products (status);

alter table public.users enable row level security;
alter table public.shops enable row level security;
alter table public.products enable row level security;

drop policy if exists user_self_read on public.users;
create policy user_self_read on public.users
for select
using (clerk_id = auth.jwt() ->> 'sub');

-- Safe Admin Check Function
create or replace function public.is_admin()
returns boolean
language sql
security definer
as $$
  select role = 'admin'
  from public.users
  where id = auth.uid();
$$;

drop policy if exists admin_users_read on public.users;
create policy admin_users_read on public.users
for select
using (
  auth.uid() = id OR public.is_admin()
);

drop policy if exists admin_users_update on public.users;
create policy admin_users_update on public.users
for update
using (
  auth.uid() = id OR public.is_admin()
);

drop policy if exists shop_owner_select on public.shops;
create policy shop_owner_select on public.shops
for select
using (owner_id = auth.uid());

drop policy if exists shop_owner_update on public.shops;
create policy shop_owner_update on public.shops
for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists shop_owner_delete on public.shops;
create policy shop_owner_delete on public.shops
for delete
using (owner_id = auth.uid());

drop policy if exists admin_access on public.shops;
create policy admin_access on public.shops
for all
using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));

drop policy if exists public_approved_read on public.shops;
create policy "Public can view approved shops" on public.shops
for select
using (status = 'approved');

drop policy if exists shopkeeper_crud on public.products;
create policy shopkeeper_crud on public.products
for all
using (shop_id in (select id from public.shops where owner_id = auth.uid()));

drop policy if exists admin_access_products on public.products;
create policy admin_access_products on public.products
for all
using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));

drop policy if exists public_read on public.products;
create policy "Public can view products" on public.products
for select
using (true);
