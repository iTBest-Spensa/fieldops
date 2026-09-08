FIELDOPS LIVE DISPATCH V1.2 — CLEAN TRACK BOARD

UI-only patch. No database migration required.

Changes:
- Removed the separate Status column.
- Status badge now lives inside the Technician column.
- View schedule now opens a centered popup window instead of a right-side drawer.
- Schedule popup shows technician role, current status, dispatch fit, Today/Week tabs and schedule details.
- Replaced repeated per-technician NOW markers with one clean NOW line spanning the entire track board.
- Track labels are constrained to their own activity segment so neighboring titles cannot paint over each other.
- Removed long work-order IDs from the visible track labels; full IDs/details remain in the solid hover hint.
- Gap labels are constrained inside the gap segment.
- Live Supabase data, drag/drop, realtime, dispatch fit, Day/Night theme and hover details are preserved.

INSTALL
1. Stop npm run dev with Ctrl+C
2. cd C:\Projects\fieldops
3. Copy-Item .\app\page.tsx .\app\page.before-clean-track-v1-2.tsx -Force
4. Extract this ZIP over C:\Projects\fieldops
5. npm run dev
