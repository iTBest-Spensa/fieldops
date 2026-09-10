FIELDOPS PAGE: Customers

Primary route: /customers
Primary page file: app/customers/page.tsx

Rule from this baseline:
Keep Customers-specific UI, page state, page handlers, and page-only helpers inside app/customers/ whenever practical.
Shared application infrastructure may remain outside the page folder (theme, Supabase client, global layout, globals.css, generic UI components).
