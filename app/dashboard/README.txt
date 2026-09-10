FIELDOPS PAGE: Dashboard

Primary route: /dashboard
Primary page file: app/dashboard/page.tsx

Rule from this baseline:
Keep Dashboard-specific UI, page state, page handlers, and page-only helpers inside app/dashboard/ whenever practical.
Shared application infrastructure may remain outside the page folder (theme, Supabase client, global layout, globals.css, generic UI components).
