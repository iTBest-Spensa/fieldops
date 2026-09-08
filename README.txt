FIELDOPS LIVE DISPATCH V1.5.1 — OVERTIME TRACK FIX

Exact bug fixed:
- V1.5 visually changed the Dispatch board to 6 AM–10 PM.
- But buildTrackForDate was still filtering/clipping live segments to 8 AM–5 PM.
- Therefore overtime jobs existed in Supabase and appeared in the schedule popup,
  but disappeared from the main Daily Track.

Fix:
- Daily Track now uses BOARD_START_HOUR and BOARD_END_HOUR consistently.
- 6 AM–10 PM assignments display on the same selected date.
- Overtime after 5 PM displays correctly.
- Technician status can now reflect those visible overtime assignments too.

No database migration required.

INSTALL
1. Ctrl+C
2. cd C:\Projects\fieldops
3. Copy-Item .\app\page.tsx .\app\page.before-overtime-track-fix-v1-5-1.tsx -Force
4. Extract this ZIP over C:\Projects\fieldops
5. npm run dev
