FIELDOPS DISPATCH V1
====================

Purpose
-------
This is the first FieldOps-native Dispatch board. It solves the same field-service problem as products such as ServiceTitan without copying their screen.

What is different in FieldOps
-----------------------------
1. Work Queue is a collapsible horizontal queue above the board instead of a permanent side panel.
2. The right side is a context-sensitive Work Inspector, not an Activity Center.
3. Technician rows include visible utilization and open-capacity information.
4. The Inspector includes a Best Fit ranking based on skills, capacity, and shift status.
5. Job cards use restrained FieldOps status styling and a narrow priority rail instead of reproducing another product's color system.
6. The page supports the existing FieldOps day/night theme through Tailwind dark: classes.

Current functionality
---------------------
- Day timeline from 8 AM to 5 PM
- Team grouping
- Technician status and utilization
- Collapsible unassigned Work Queue
- Drag unassigned work onto a technician
- Drag assigned jobs between technicians
- Search work orders/customers
- Team filtering
- Work Inspector
- Unassign work back to the queue
- Best Fit suggestions
- Light/dark theme compatible
- No extra npm dependency required

Important
---------
This V1 intentionally uses preview data inside components/dispatch/dispatch-data.ts so the new workflow can be judged visually before database writes are enabled.

The existing Supabase schema already contains work_orders and work_order_assignments, including scheduled_start/scheduled_end, status, priority, technician_id, assignment status, and work_order_events. The next step is to connect this UI to those tables and save drag/drop assignments to Supabase.

Install
-------
From PowerShell, with this ZIP in your Downloads folder:

cd C:\Projects\fieldops
Expand-Archive -Path "$env:USERPROFILE\Downloads\fieldops_dispatch_v1.zip" -DestinationPath "C:\Projects\fieldops" -Force
npm run dev

Then open:
http://localhost:3000/dispatch

Sidebar
-------
See _fieldops_dispatch_docs\SIDEBAR_ADD.txt.
