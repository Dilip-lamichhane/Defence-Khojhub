You are integrating authentication and authorization into an existing multi-role e-commerce platform.

STRICTLY follow this architecture:

Authentication → Clerk
Authorization → Supabase

Do not mix responsibilities.
Do not redesign UI.
Do not modify unrelated modules.

🔐 PART 1 — Clerk Configuration (Authentication Only)
Clerk must handle ONLY:

Email

Password / OAuth

User ID (clerk_id)

Session

Basic metadata (optional)

Important Rules:

DO NOT store roles in Clerk.

DO NOT implement authorization logic in Clerk.

DO NOT rely on Clerk metadata for permissions.

Clerk’s only responsibility is:

"User authenticated with clerk_id = xyz"

🗄 PART 2 — Supabase Users Table (Authorization Layer)

Create the following table in Supabase:

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  clerk_id text unique not null,
  email text not null,
  role text not null check (role in ('admin', 'shopowner', 'user')),
  created_at timestamp with time zone default now()
);
Requirements:

clerk_id must be unique

Default role must always be "user"

Do not allow null role

Enable Row Level Security (RLS)

🔁 PART 3 — Signup Synchronization Flow

When a user signs up via Clerk:

Step 1:

Clerk creates user.

Step 2:

After successful authentication:

Extract:

clerk_id

email

Step 3:

Insert into Supabase users table:

clerk_id = Clerk user ID
email = Clerk email
role = "user"
Step 4:

Before inserting:

Check if user with clerk_id already exists

If exists → DO NOTHING

Prevent duplicate entries

This logic must run:

After signup

On first login fallback check

🧠 PART 4 — Middleware / Role Sync

Create server-side middleware that:

Verifies Clerk session

Extracts clerk_id

Fetches user record from Supabase

Attaches role to request context

If:

No Clerk session → reject request

No Supabase user record → reject request

Never trust frontend role values.

🛡 PART 5 — Role-Based Route Protection

Implement server-side guards:

Admin Routes:

Allow only if role = 'admin'

Shop Owner Routes:

Allow only if role = 'shopowner'

User Routes:

Allow only if role = 'user' (or public where applicable)

All checks must happen server-side.

🔒 PART 6 — Row Level Security (RLS) Policies

Enable RLS:

alter table public.users enable row level security;
Policy: User Can View Own Record
create policy "Users can view their own record"
on public.users
for select
using (clerk_id = auth.jwt() ->> 'sub');
Policy: Admin Can View All Users
create policy "Admin can view all users"
on public.users
for select
using (
  exists (
    select 1 from public.users u
    where u.clerk_id = auth.jwt() ->> 'sub'
    and u.role = 'admin'
  )
);
Policy: Admin Can Update Roles
create policy "Admin can update roles"
on public.users
for update
using (
  exists (
    select 1 from public.users u
    where u.clerk_id = auth.jwt() ->> 'sub'
    and u.role = 'admin'
  )
);

Do NOT allow public role modification.

🔄 PART 7 — Controlled Role Change Workflow

Role must NEVER be editable directly in frontend.

Create secure admin-only API endpoint:

POST /admin/change-role

Requirements:

Verify Clerk session

Verify requester role = admin

Validate new role value

Update Supabase users table

Log change

Do not expose direct database access from client.

🏪 PART 8 — Usage in Existing Modules

Update existing modules to check role from Supabase:

Shop Creation:

Only allow if role = 'shopowner'

Admin Dashboard:

Only allow if role = 'admin'

Product Management:

Check shopowner ownership

Do NOT read role from Clerk.
Always fetch from Supabase.

🔐 PART 9 — Security Constraints (Non-Negotiable)

Never store role in localStorage

Never trust client-side role state

Never expose service role key to frontend

Always validate role server-side

Prevent direct SQL access from client

Protect all admin endpoints

🧱 FINAL EXPECTED ARCHITECTURE

Authentication → Clerk
User Identity → clerk_id
Authorization → Supabase users table
Permissions → Supabase RLS + server guards
Role changes → Admin API → Supabase

🚫 DO NOT:

Redesign UI

Modify unrelated modules

Store roles in Clerk

Implement partial RLS

Mix authentication and authorization

✅ DELIVERABLES

After implementation, system must support:

Secure signup sync

Role-based route protection

RLS enforced in database

Controlled admin role changes

Clean separation of identity and authorization