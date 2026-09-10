FIELDOPS PAGE: Reports

Primary route: /reports
Primary page file: app/reports/page.tsx

Rule from this baseline:
Keep Reports-specific UI, page state, page handlers, and page-only helpers inside app/reports/ whenever practical.
Shared application infrastructure may remain outside the page folder (theme, Supabase client, global layout, globals.css, generic UI components).
