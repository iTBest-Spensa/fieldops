"use client";

import { useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

const AUTO_FLOW_INTERVAL_MS = 60_000;

export function FieldOpsAutoFlow() {
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let active = true;
    let running = false;

    const activateDueAssignments = async () => {
      if (!active || running) return;
      running = true;

      try {
        const { data } = await supabase.auth.getUser();
        if (!data.user) return;

        // Safe/idempotent backend check. If pg_cron is enabled the database
        // also runs this server-side; this browser check is the deployment-safe fallback.
        await supabase.rpc("fieldops_start_due_assignments");
      } finally {
        running = false;
      }
    };

    void activateDueAssignments();

    const timer = window.setInterval(() => {
      void activateDueAssignments();
    }, AUTO_FLOW_INTERVAL_MS);

    const handleFocus = () => void activateDueAssignments();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void activateDueAssignments();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [supabase]);

  return null;
}
