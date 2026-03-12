-- Supabase schema fixes for shopkeeper dashboard + map sync

-- Ensure UUID helper exists
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

-- Drop and recreate shops table with uuid id if needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shops' AND column_name = 'id' AND data_type = 'integer'
  ) THEN
    -- Drop shops table if id is integer
    EXECUTE 'DROP TABLE IF EXISTS shops CASCADE';
    EXECUTE 'CREATE TABLE shops (id uuid PRIMARY KEY DEFAULT gen_random_uuid())';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);
-- REVIEWS TABLE (for REAL and DUMMY projects)
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid REFERENCES shops(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Indexes for reviews
CREATE INDEX IF NOT EXISTS idx_reviews_shop_id ON reviews(shop_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);

-- View for shop rating aggregates
-- Drop existing view first to avoid "cannot change data type of view column" errors
DROP VIEW IF EXISTS public.shop_rating_stats CASCADE;
CREATE VIEW public.shop_rating_stats AS
SELECT
  shop_id,
  AVG(rating)::numeric(2,1) AS average_rating,
  COUNT(*) AS review_count
FROM public.reviews
GROUP BY shop_id;

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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'shops_owner_id_fkey'
  ) THEN
    ALTER TABLE shops
      ADD CONSTRAINT shops_owner_id_fkey
      FOREIGN KEY (owner_id) REFERENCES users(clerk_id) ON DELETE SET NULL NOT VALID;
  END IF;
END $$;

ALTER TABLE IF EXISTS shops
  ADD COLUMN IF NOT EXISTS name text;

ALTER TABLE IF EXISTS shops
  ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE IF EXISTS shops
  ADD COLUMN IF NOT EXISTS category text;

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

CREATE INDEX IF NOT EXISTS shops_owner_id_idx ON shops (owner_id);
CREATE INDEX IF NOT EXISTS shops_category_idx ON shops (category);

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
-- Convert shop_id to uuid if it exists; attempt safe cast, fallback to drop+recreate
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'shop_id'
  ) THEN
    -- If column is integer try casting; if cast fails, drop and recreate as uuid
    IF (SELECT data_type FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'shop_id') = 'integer' THEN
      BEGIN
        EXECUTE 'ALTER TABLE products ALTER COLUMN shop_id TYPE uuid USING shop_id::uuid';
      EXCEPTION WHEN OTHERS THEN
        -- Cannot cast existing values to uuid; recreate column as uuid (loses old values)
        EXECUTE 'ALTER TABLE products DROP COLUMN IF EXISTS shop_id';
        EXECUTE 'ALTER TABLE products ADD COLUMN shop_id uuid';
      END;
    END IF;
  ELSE
    -- If column does not exist, create it as uuid
    EXECUTE 'ALTER TABLE products ADD COLUMN IF NOT EXISTS shop_id uuid';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS products_shop_id_idx ON products (shop_id);

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
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_shop_id_fkey'
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_shop_id_fkey
      FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE;
  END IF;
END $$;
