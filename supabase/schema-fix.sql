-- Supabase schema fixes for shopkeeper dashboard + map sync

-- Ensure UUID helper exists
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Ensure base tables exist in fresh/dummy projects
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

CREATE TABLE IF NOT EXISTS shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

-- USERS TABLE
-- Drop ALL existing RLS policies to avoid auth.uid() casts
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'users' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON users', r.policyname);
  END LOOP;
END $$;

ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS clerk_id text;

ALTER TABLE IF EXISTS users
  ALTER COLUMN clerk_id TYPE text USING clerk_id::text;

ALTER TABLE IF EXISTS users
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS email text;

ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';

ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS users_clerk_id_key ON users (clerk_id);

ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;

-- Recreate RLS policies using Clerk JWT subject (string)
CREATE POLICY user_self_read
ON users
FOR SELECT
USING (clerk_id = (auth.jwt() ->> 'sub'));

CREATE POLICY user_self_update
ON users
FOR UPDATE
USING (clerk_id = (auth.jwt() ->> 'sub'))
WITH CHECK (clerk_id = (auth.jwt() ->> 'sub'));

-- SHOPS TABLE
-- Drop ALL existing RLS policies on shops to avoid auth.uid() casting
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'shops' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON shops', r.policyname);
  END LOOP;
END $$;

-- Drop incompatible FK (owner_id -> users.id) before type change
ALTER TABLE IF EXISTS shops
  DROP CONSTRAINT IF EXISTS shops_owner_id_fkey;

ALTER TABLE IF EXISTS shops
  ADD COLUMN IF NOT EXISTS owner_id text;

ALTER TABLE IF EXISTS shops
  ALTER COLUMN owner_id TYPE text USING owner_id::text;

ALTER TABLE IF EXISTS shops
  ADD COLUMN IF NOT EXISTS name text;

ALTER TABLE IF EXISTS shops
  ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE IF EXISTS shops
  ADD COLUMN IF NOT EXISTS image_url text;

ALTER TABLE IF EXISTS shops
  ADD COLUMN IF NOT EXISTS open_time time;

ALTER TABLE IF EXISTS shops
  ADD COLUMN IF NOT EXISTS close_time time;

ALTER TABLE IF EXISTS shops
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

ALTER TABLE IF EXISTS shops
  ADD COLUMN IF NOT EXISTS latitude double precision;

ALTER TABLE IF EXISTS shops
  ADD COLUMN IF NOT EXISTS longitude double precision;

ALTER TABLE IF EXISTS shops
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

ALTER TABLE IF EXISTS shops
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE IF EXISTS shops ENABLE ROW LEVEL SECURITY;

-- Recreate RLS policies using Clerk JWT subject (string)
CREATE POLICY shop_owner_select
ON shops
FOR SELECT
USING (owner_id = (auth.jwt() ->> 'sub'));

CREATE POLICY shop_owner_insert
ON shops
FOR INSERT
WITH CHECK (owner_id = (auth.jwt() ->> 'sub'));

CREATE POLICY shop_owner_update
ON shops
FOR UPDATE
USING (owner_id = (auth.jwt() ->> 'sub'))
WITH CHECK (owner_id = (auth.jwt() ->> 'sub'));

CREATE POLICY shop_owner_delete
ON shops
FOR DELETE
USING (owner_id = (auth.jwt() ->> 'sub'));

-- Public read policy for map UI (approved shops)
DROP POLICY IF EXISTS shop_public_read ON shops;
CREATE POLICY shop_public_read
ON shops
FOR SELECT
USING (true);

-- PRODUCTS TABLE
-- Drop ALL existing RLS policies to avoid auth.uid() casts
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'products' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON products', r.policyname);
  END LOOP;
END $$;

ALTER TABLE IF EXISTS products
  ADD COLUMN IF NOT EXISTS owner_id text;

ALTER TABLE IF EXISTS products
  ALTER COLUMN owner_id TYPE text USING owner_id::text;

ALTER TABLE IF EXISTS products
  ADD COLUMN IF NOT EXISTS shop_id uuid;

ALTER TABLE IF EXISTS products
  ADD COLUMN IF NOT EXISTS name text;

ALTER TABLE IF EXISTS products
  ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE IF EXISTS products
  ADD COLUMN IF NOT EXISTS category text;

ALTER TABLE IF EXISTS products
  ADD COLUMN IF NOT EXISTS price numeric;

ALTER TABLE IF EXISTS products
  ADD COLUMN IF NOT EXISTS image_url text;

ALTER TABLE IF EXISTS products
  ADD COLUMN IF NOT EXISTS in_stock boolean DEFAULT true;

ALTER TABLE IF EXISTS products
  ADD COLUMN IF NOT EXISTS availability text DEFAULT 'available';

ALTER TABLE IF EXISTS products
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

ALTER TABLE IF EXISTS products
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE IF EXISTS products ENABLE ROW LEVEL SECURITY;

-- Shopkeeper CRUD policy for products
DROP POLICY IF EXISTS shopkeeper_crud ON products;
CREATE POLICY shopkeeper_crud
ON products
FOR ALL
USING (owner_id = (auth.jwt() ->> 'sub'))
WITH CHECK (owner_id = (auth.jwt() ->> 'sub'));

-- Public read policy for shop catalogs
DROP POLICY IF EXISTS products_public_read ON products;
CREATE POLICY products_public_read
ON products
FOR SELECT
USING (true);

-- OPTIONAL FK (only if you want strict integrity)
-- ALTER TABLE IF EXISTS products
--   ADD CONSTRAINT IF NOT EXISTS products_shop_id_fkey
--   FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE;
