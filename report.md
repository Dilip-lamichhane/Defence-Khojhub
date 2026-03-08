# KhojHub — Comprehensive Technical Report

## 1) Project Overview
**Project name:** KhojHub  
**Purpose:** A location-based marketplace that helps users discover local shops and products on a map, with role-based experiences for customers, shopkeepers, and admins.  
**Target users:** General users (customers), shopkeepers (business owners), and administrators.  
**High-level system overview:**
- **Frontend (React + Vite)** provides map browsing, search, auth screens, dashboards, and admin UI.
- **Backend (Node + Express)** exposes REST APIs for shops, products, reviews, admin tools, and Supabase-backed map/catalog data.
- **Datastores:** MongoDB for core app entities; Supabase (Postgres) for geospatial demo/real shop catalogs with two project modes (REAL/DUMMY).
- **Auth:** Clerk for authentication; role/permissions resolved server-side with Supabase users table.

## 2) Technology Stack
**Frontend:**
- React (Vite) — SPA UI layer and routing
- Redux Toolkit — state management for auth, shops, map, and UI
- Tailwind CSS — styling and responsive UI
- Clerk React SDK — auth UI + session handling
- Maplibre GL (Map UI), plus OSRM routing for directions

**Backend:**
- Node.js + Express — API server
- Mongoose — MongoDB ODM
- Supabase JS SDK — Postgres queries for map/catalog data
- Clerk SDK — token verification

**Build & Tooling:**
- Vite for frontend build
- npm for package management

## 3) Project Structure
```
frontend/     # React app (pages, components, store)
backend/      # Express API (routes, controllers, middleware, models)
supabase/     # SQL scripts for RLS fixes
```
**frontend/src/**
- `pages/` — app screens (Map, Admin, Shopkeeper, Auth, Profile, etc.)
- `components/` — reusable UI (Header, Footer, ProtectedRoute, Map UI components)
- `store/` — Redux slices and store configuration
- `config/` — Supabase configuration and project selection

**backend/**
- `routes/` — API endpoint groupings
- `controllers/` — request handlers and business logic
- `middleware/` — auth and RBAC
- `models/` — MongoDB schema definitions
- `config/` — Supabase client factory

## 4) Frontend Architecture
**Routing:**
- `/map` — main map interface
- `/admin` — admin dashboard (protected)
- `/shop` — shopkeeper dashboard (protected)
- `/login`, `/register`, `/profile`, etc.

**State management (Redux):**
- `authSlice` — user session (synced via Clerk + backend), role, active Supabase project
- `shopsSlice` — shop data for map and catalog
- `mapSlice` — map UI state (center, zoom, radius)

**API integration:**
- Axios in slices for `/api/v1/*` endpoints
- Map data fetched from `/api/v1/supabase/shops` with `x-supabase-project` header

**Key pages:**
- **Map UI:** CategoryMapPageScrollable (Maplibre + routing)
- **Admin dashboard:** AdminPortal
- **Shopkeeper dashboard:** ShopkeeperDashboard
- **Auth pages:** Login/Register/Profile

## 5) Map System
**Map library:** Maplibre GL (raster OpenStreetMap tiles).  
**Marker rendering:**
- Shops are mapped from Redux `shops` state to markers based on `shop.location.coordinates`.
- Markers are created with custom icons and popups, with catalog and routing actions.

**Search & routing:**
- Location search uses Nominatim for geocoding.
- Directions are fetched via OSRM (`router.project-osrm.org`).
- When routing starts, shop popups are hidden to avoid UI blocking.

**Data flow (map):**
- UI triggers `fetchSupabaseShops` → backend `/api/v1/supabase/shops` → Supabase data → Redux update → markers render.

## 6) Backend Architecture
**Server framework:** Express.  
**API structure:**
- `/api/v1/auth` — auth endpoints (Clerk-based)
- `/api/v1/clerk-auth` — Clerk sync + profile
- `/api/v1/shops`, `/products`, `/reviews`, `/categories`
- `/api/v1/supabase` — map/catalog data from Supabase
- `/api/v1/admin` — admin operations (Mongo + Supabase)

**Controllers:** handle request validation, database access, error responses.

**Middleware:**
- `auth.js` — Clerk token validation + Supabase role lookup
- `clerkSupabaseAuth.js` — Clerk auth + Supabase user linkage
- `rbac.js` — permissions for admin actions

## 7) Authentication System (Clerk)
- Clerk handles login/session.
- Backend validates Clerk JWT and maps to Supabase `users` table.
- Role is derived from Supabase, not client-side metadata.
- Frontend uses `ProtectedRoute` to guard admin/shop routes based on backend role.

## 8) Database Architecture (Supabase)
**Supabase tables (expected):**
- `shops`: id, name, latitude, longitude, owner_id, status, created_at
- `products`: id, shop_id, name, price, status
- `users`: id, clerk_id, email, role

**Relationships:**
- `products.shop_id → shops.id`
- `shops.owner_id → users.id` (optional FK; if missing, avoid relational join)

**MongoDB collections:**
- Users, Shops, Products, Reviews, Categories, Reports

## 9) Environment Configuration
**Frontend:**
- `VITE_REAL_SUPABASE_URL`, `VITE_DUMMY_SUPABASE_URL`
- `VITE_REAL_SUPABASE_ANON_KEY`, `VITE_DUMMY_SUPABASE_ANON_KEY`
- `VITE_ACTIVE_SUPABASE_PROJECT`, `VITE_API_URL`

**Backend:**
- `REAL_SUPABASE_URL`, `REAL_SUPABASE_ANON_KEY`, `REAL_SUPABASE_SERVICE_KEY`
- `DUMMY_SUPABASE_URL`, `DUMMY_SUPABASE_ANON_KEY`, `DUMMY_SUPABASE_SERVICE_KEY`
- `ACTIVE_SUPABASE_PROJECT`, `CLERK_SECRET_KEY`

**Database switch:**
- Frontend sends `x-supabase-project` header (REAL/DUMMY). Backend selects corresponding Supabase client; no fallback to generic variables.

## 10) API Data Flow (Example)
**Map shops:**
- UI → `fetchSupabaseShops` → `GET /api/v1/supabase/shops` with project header
- Backend → Supabase query (REAL/DUMMY) → data response
- Redux updates → map markers render

## 11) Admin System
**Admin dashboard:** AdminPortal  
**Features:**
- Shop approval/moderation
- User management
- Reports & analytics
- Supabase shop list and status updates

**Protection:**
- ProtectedRoute (frontend)
- RBAC middleware + Supabase role check (backend)

## 12) Shopkeeper System
**Shopkeeper dashboard:** ShopkeeperDashboard  
**Features (current UI scaffolding):**
- Product list, create/edit/delete
- Shop registration via Supabase endpoints

## 13) Error Handling
- Backend: try/catch, structured JSON errors
- Frontend: error states in Redux and UI alerts
- Map: handles location and routing failures gracefully

## 14) Security Analysis
- Clerk auth for sessions
- Server-side RBAC + Supabase roles for admin access
- No service role key on frontend
- Potential risk: if Supabase RLS is misconfigured, admin operations may fail or leak data

## 15) Deployment Structure
**Expected:**
- Frontend: static hosting (Vercel/Netlify)
- Backend: Node server (Render/AWS/Heroku)
- Databases: MongoDB Atlas + Supabase

## 16) Performance Considerations
- Map marker rendering can be heavy for large datasets
- Supabase queries fetch up to 500 rows; pagination may be needed for scale
- OSRM routing requests per navigation action

## 17) Current Known Issues
- Missing FK between shops.owner_id and users.id causes join errors (fixed by using explicit selects).
- Dummy vs Real database confusion if header/project is not enforced.
- Admin routes can fail if service role keys are missing.

## 18) Future Improvements
- Add marker clustering for scalability
- Add caching for map queries
- Introduce pagination for shop list in admin
- Improve shopkeeper workflows (real CRUD linked to backend)
- Enhance RLS policies and auditing

## 19) Final Summary
**Strengths:** clear separation of frontend/backend, dual Supabase project support, role-based admin workflows, rich map experience.  
**Weaknesses:** schema inconsistencies and FK absence, potential operational issues if environment variables are misconfigured.  
**Overall:** A modern, map-centric marketplace with Clerk authentication and Supabase-backed geospatial data, suitable for scaling once database relations and operational guardrails are finalized.
