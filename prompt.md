I have multiple 500 Internal Server Errors:

🔥 ADMIN ROUTES FAILING

GET
/api/v1/admin/shops?status=pending&page=1&limit=20 → 500

GET
/api/v1/admin/supabase/shops?status=pending&limit=20&offset=0 → 500

Triggered from:

AdminPortal.jsx

apiRequest function

🔥 AUTH FAILING

POST
/api/v1/clerk-auth/clerk-sync → 500

Triggered from:

authSlice.js

AuthBootstrap.jsx

🎯 YOUR OBJECTIVE

Perform a full backend + frontend audit and fix:

clerk-sync 500 crash

admin shop fetch 500 crash

Supabase query failures

Pagination logic issues

Route mismatch or duplicate admin routes

Any RLS or service role issues

Ensure system is production-safe

Do NOT give generic advice.
Do NOT assume.
Audit the architecture end-to-end.

🔎 STEP 1 — LOG THE REAL ERROR

Modify ALL failing controllers to:

try {
   ...
} catch (error) {
   console.error("FULL ERROR:", error);
   console.error("STACK:", error.stack);
   return res.status(500).json({
      message: "Internal server error",
      error: error.message
   });
}

I need the REAL error printed.

🔎 STEP 2 — ROUTE STRUCTURE AUDIT

Verify:

adminRoutes file exists

supabaseAdminRoutes file exists

clerkAuthRoutes file exists

All mounted in app.js correctly:

app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/admin/supabase', supabaseAdminRoutes);
app.use('/api/v1/clerk-auth', clerkAuthRoutes);

Check for:

Duplicate routes

Conflicting routes

Incorrect mount paths

Missing express.json()

🔎 STEP 3 — ADMIN SHOPS CONTROLLER AUDIT

Inspect controller for:

Invalid destructuring:
const { status, page, limit } = req.query

page or limit being undefined

limit being string instead of number

offset calculation error

Supabase query failing

Rewrite pagination safely:

const pageNum = parseInt(page) || 1;
const limitNum = parseInt(limit) || 20;
const offset = (pageNum - 1) * limitNum;

Then:

const { data, error } = await supabase
   .from('shops')
   .select('*', { count: 'exact' })
   .eq('status', status)
   .range(offset, offset + limitNum - 1);

If error → log full object.

🔎 STEP 4 — SUPABASE CLIENT AUDIT

Verify:

SUPABASE_URL exists

SUPABASE_SERVICE_ROLE_KEY exists

Using service role key for admin routes

RLS not blocking admin reads

shops table exists

status column exists

status values exactly match (pending vs Pending)

If RLS enabled → temporarily disable for debugging.

🔎 STEP 5 — clerk-sync CONTROLLER AUDIT

Inspect:

Authorization header parsing

JWT verification

CLERK_SECRET_KEY defined

supabase upsert logic

users table exists

conflict column exists (clerk_id)

Add logging for:

req.headers.authorization

decoded token

Supabase error

Return structured error response.

🔎 STEP 6 — FRONTEND API LAYER AUDIT

Inspect:

AdminPortal.jsx → apiRequest

Check:

Base URL correct

Token attached correctly

Authorization header format:
Authorization: Bearer <token>

No undefined token

No double requests

Add console.log for:

full request URL

headers

response

🔎 STEP 7 — REMOVE DUPLICATE ENDPOINTS

You currently have BOTH:

/api/v1/admin/shops

/api/v1/admin/supabase/shops

Choose ONE clean architecture.

Remove duplication.
Unify logic.
Avoid double querying.

📦 REQUIRED OUTPUT

Return:

1️⃣ Exact root cause of 500 errors
2️⃣ Corrected app.js
3️⃣ Corrected admin routes
4️⃣ Corrected clerk routes
5️⃣ Fixed Supabase client config
6️⃣ Fixed pagination controller
7️⃣ Fixed clerk-sync controller
8️⃣ Explanation of why it was failing

⚠️ STRICT RULES

No generic advice

No theory

Show corrected code

Ensure production-grade error handling

Ensure no silent crashes

Ensure consistent admin architecture

Fully audit and fix the system.