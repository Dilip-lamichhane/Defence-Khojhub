-- supabase/update-rls.sql
-- Run this script in the Supabase SQL Editor to fix the infinite recursion RLS issue.

-- 1. Create a `SECURITY DEFINER` function to safely check for admin role
-- This function runs with the privileges of its creator, bypassing RLS to avoid infinite recursion.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE clerk_id = auth.jwt() ->> 'sub' 
    AND role = 'admin'
  );
$$;

-- 2. Drop the recursive policies on the `users` table
DROP POLICY IF EXISTS admin_users_read ON public.users;
DROP POLICY IF EXISTS admin_users_update ON public.users;

-- 3. Recreate the policies using the non-recursive function
CREATE POLICY admin_users_read ON public.users
FOR SELECT
USING ( public.is_admin() );

CREATE POLICY admin_users_update ON public.users
FOR UPDATE
USING ( public.is_admin() );

-- Verify that the `user_self_read` policy is intact
-- CREATE POLICY user_self_read ON public.users FOR SELECT USING (clerk_id = auth.jwt() ->> 'sub');

-- ------------------------------------------------------------------
-- Reviews table RLS policies
-- ------------------------------------------------------------------
-- Ensure RLS enabled for reviews
ALTER TABLE IF EXISTS public.reviews ENABLE ROW LEVEL SECURITY;

-- Public read access for reviews (map and shop pages)
DROP POLICY IF EXISTS reviews_public_read ON public.reviews;
CREATE POLICY reviews_public_read ON public.reviews
FOR SELECT
USING (true);

-- Authenticated users can insert reviews where jwt sub matches user_id
DROP POLICY IF EXISTS reviews_user_create ON public.reviews;
CREATE POLICY reviews_user_create ON public.reviews
FOR INSERT
WITH CHECK (auth.jwt() ->> 'sub' = user_id);

-- Authenticated users can update their own reviews
DROP POLICY IF EXISTS reviews_user_update ON public.reviews;
CREATE POLICY reviews_user_update ON public.reviews
FOR UPDATE
USING (auth.jwt() ->> 'sub' = user_id)
WITH CHECK (auth.jwt() ->> 'sub' = user_id);

-- Authenticated users can delete their own reviews
DROP POLICY IF EXISTS reviews_user_delete ON public.reviews;
CREATE POLICY reviews_user_delete ON public.reviews
FOR DELETE
USING (auth.jwt() ->> 'sub' = user_id);

-- Optionally add an admin bypass if `is_admin()` is available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') THEN
    -- Allow admins to DELETE/UPDATE any review
    DROP POLICY IF EXISTS reviews_admin_manage ON public.reviews;
    CREATE POLICY reviews_admin_manage ON public.reviews
    FOR ALL
    USING ( public.is_admin() )
    WITH CHECK ( public.is_admin() );
  END IF;
END $$;
