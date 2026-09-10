import type { DbAssignment, DbEvent, DbProfile, DbWorkOrder } from "../types";
import { formatLocalDateTime } from "../utils";

type ActivityFlowRecord = {
  key: string;
  label: string;
  occurredAt: string | null;
  reached: boolean;
  current: boolean;
};

export function ActivityPanel({
  order,
  assignments,
  events,
  loading,
  profileMap,
}: {
  order: DbWorkOrder;
  assignments: DbAssignment[];
  events: DbEvent[];
  loading: boolean;
  profileMap: Map<string, DbProfile>;
}) {
  if (loading) {
    return (
      <div className="border border-border p-6 text-sm text-muted-foreground">
        Loading activity flow…
      </div>
    );
  }

  const chronologicalEvents = [...events].sort(
    (a, b) =>
      new Date(a.created_at).getTime() -
      new Date(b.created_at).getTime()
  );

  const mainFlow = [
    { key: "dispatched", label: "Dispatched" },
    { key: "travelling", label: "Travelling" },
    { key: "working", label: "Working" },
    { key: "finished", label: "Finished" },
    { key: "billing", label: "Billing" },
    { key: "closed", label: "Closed" },
  ] as const;

  const subFlow = [
    { key: "assigned", label: "Assigned", parentKey: "dispatched" },
    { key: "on_site", label: "On Site", parentKey: "travelling" },
    { key: "waiting", label: "Waiting", parentKey: "working" },
  ] as const;

  const firstAssignment = [...assignments]
    .filter(
      (assignment) =>
        assignment.assignment_role === "primary" &&
        !["declined", "removed"].includes(
          assignment.assignment_status
        )
    )
    .sort((a, b) => {
      const aTime = a.assigned_at
        ? new Date(a.assigned_at).getTime()
        : Number.MAX_SAFE_INTEGER;
      const bTime = b.assigned_at
        ? new Date(b.assigned_at).getTime()
        : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    })[0];

  const assignedTechnicianName = firstAssignment
    ? profileMap.get(firstAssignment.technician_id)?.full_name ??
      profileMap.get(firstAssignment.technician_id)?.email ??
      "Assigned technician"
    : null;

  function firstEventTimeForStatus(status: string) {
    return (
      chronologicalEvents.find(
        (event) => event.new_status === status
      )?.created_at ?? null
    );
  }

  const times = new Map<string, string | null>();

  const firstDispatchedAssignment = [...assignments]
    .filter(
      (assignment) =>
        assignment.assignment_role === "primary" &&
        !["declined", "removed"].includes(
          assignment.assignment_status
        )
    )
    .sort((a, b) => {
      const aTime = a.assigned_at
        ? new Date(a.assigned_at).getTime()
        : Number.MAX_SAFE_INTEGER;
      const bTime = b.assigned_at
        ? new Date(b.assigned_at).getTime()
        : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    })[0];

  times.set(
    "dispatched",
    firstDispatchedAssignment?.assigned_at ??
      firstEventTimeForStatus("assigned") ??
      null
  );

  // Dispatcher assignment is final immediately.
  // Assigned is reached when the active primary assignment is created.
  times.set(
    "assigned",
    firstAssignment?.assigned_at ?? null
  );

  times.set(
    "travelling",
    firstEventTimeForStatus("travelling")
  );

  times.set(
    "on_site",
    firstEventTimeForStatus("on_site")
  );

  times.set(
    "working",
    firstEventTimeForStatus("working")
  );

  times.set(
    "waiting",
    firstEventTimeForStatus("waiting")
  );

  times.set(
    "finished",
    firstEventTimeForStatus("finished") ??
      order.completed_at ??
      null
  );

  times.set(
    "billing",
    firstEventTimeForStatus("billing_ready") ??
      order.billing_ready_at ??
      null
  );

  times.set(
    "closed",
    firstEventTimeForStatus("closed") ??
      order.closed_at ??
      null
  );

  const statusToFlowKey: Record<string, string> = {
    assigned: "assigned",
    travelling: "travelling",
    on_site: "on_site",
    working: "working",
    waiting: "waiting",
    finished: "finished",
    billing_ready: "billing",
    closed: "closed",
  };

  const currentFlowKey =
    statusToFlowKey[order.status] ?? null;

  if (
    currentFlowKey &&
    !times.get(currentFlowKey)
  ) {
    times.set(currentFlowKey, order.updated_at);
  }

  const mainRecords: ActivityFlowRecord[] =
    mainFlow.map((stage) => ({
      key: stage.key,
      label: stage.label,
      occurredAt: times.get(stage.key) ?? null,
      reached: Boolean(times.get(stage.key)),
      current:
        currentFlowKey === stage.key ||
        (
          currentFlowKey === "assigned" &&
          stage.key === "dispatched" &&
          Boolean(firstDispatchedAssignment)
        ) ||
        (
          currentFlowKey === "on_site" &&
          stage.key === "travelling"
        ) ||
        (
          currentFlowKey === "waiting" &&
          stage.key === "working"
        ),
    }));

  const subRecords = subFlow.map((stage) => ({
    key: stage.key,
    label: stage.label,
    parentKey: stage.parentKey,
    occurredAt: times.get(stage.key) ?? null,
    reached: Boolean(times.get(stage.key)),
    current:
      currentFlowKey === stage.key,
  }));

  function timeCard(
    label: string,
    occurredAt: string | null,
    reached: boolean,
    current: boolean,
    detail?: string | null
  ) {
    return (
      <div
        className={`min-w-0 border p-2.5 text-left ${
          reached
            ? current
              ? "border-primary bg-primary/[0.07]"
              : "border-border bg-card"
            : "border-border/60 bg-muted/20"
        }`}
      >
        <div
          className={`truncate text-[9px] font-black uppercase ${
            reached
              ? current
                ? "text-primary"
                : "text-foreground"
              : "text-muted-foreground"
          }`}
        >
          {label}
        </div>

        <div className="mt-1 text-[9px] font-semibold leading-4 text-muted-foreground">
          {occurredAt
            ? formatLocalDateTime(occurredAt)
            : "Not reached"}
        </div>

        {reached && detail && (
          <div className="mt-1 truncate text-[9px] font-black text-foreground">
            {detail}
          </div>
        )}
      </div>
    );
  }

  const subByParent = new Map<string, (typeof subRecords)[number]>(
    subRecords.map((record) => [
      record.parentKey,
      record,
    ])
  );

  return (
    <section className="border border-border">
      <div className="flex flex-col gap-2 border-b border-border bg-muted/30 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-xs font-black uppercase tracking-wider">
            Work Order Activity Flow
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Each card shows when that activity was entered. The line shows
            workflow sequence only, not time duration.
          </div>
        </div>

        <div className="text-[10px] font-bold uppercase text-muted-foreground">
          No normal lifecycle stage should be skipped
        </div>
      </div>

      <div className="w-full p-4">
        <div className="grid w-full grid-cols-6 gap-1.5">
          {mainRecords.map((stage, index) => {
            const sub = subByParent.get(stage.key);

            return (
              <div
                key={stage.key}
                className="min-w-0"
              >
                <div className="relative flex h-7 items-center">
                  {index > 0 && (
                    <span
                      className={`absolute left-0 right-1/2 top-1/2 h-px -translate-y-1/2 ${
                        stage.reached
                          ? "bg-primary"
                          : "bg-border"
                      }`}
                    />
                  )}

                  {index < mainRecords.length - 1 && (
                    <span
                      className={`absolute left-1/2 right-0 top-1/2 h-px -translate-y-1/2 ${
                        mainRecords[index + 1]?.reached
                          ? "bg-primary"
                          : "bg-border"
                      }`}
                    />
                  )}

                  <span
                    className={`relative z-10 mx-auto h-3 w-3 rounded-full border-2 ${
                      stage.reached
                        ? "border-primary bg-primary"
                        : "border-border bg-background"
                    }`}
                  />
                </div>

                {timeCard(
                  stage.label,
                  stage.occurredAt,
                  stage.reached,
                  stage.current
                )}

                {sub && (
                  <div className="mx-auto mt-1.5 w-[88%]">
                    <div className="mx-auto h-3.5 w-px bg-border" />
                    {timeCard(
                      sub.label,
                      sub.occurredAt,
                      sub.reached,
                      sub.current,
                      sub.key === "assigned"
                        ? assignedTechnicianName
                        : null
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 border-t border-border pt-3 text-[10px] text-muted-foreground">
          Corrections, transfers, pauses, and other update history are intentionally
          excluded from this lifecycle view and belong in the audit report.
        </div>
      </div>
    </section>
  );
}
