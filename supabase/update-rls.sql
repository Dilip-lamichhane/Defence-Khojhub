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
