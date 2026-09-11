import { Building2, CalendarDays, Clock3, PackagePlus, ReceiptText, RotateCcw, UserRound } from "lucide-react";
import type { DbAssignment, DbCustomer, DbMaterialUsage, DbProfile, DbSite, DbTimeEntry, DbWorkOrder } from "../types";
import { billingStatusLabel, formatCompactDateTime, formatLocalDateTime, isTerminalWorkOrderStatus, minutesLabel, statusLabel } from "../utils";
import { InfoCard } from "./info-card";
import { DetailRow } from "./detail-row";


type MaterialUsageGroup = {
  key: string;
  description: string;
  quantity: number;
  quantityReturned: number;
  unitPrice: number;
  billable: boolean;
  usages: DbMaterialUsage[];
};

function groupMaterialUsages(materialUsages: DbMaterialUsage[]): MaterialUsageGroup[] {
  const groups = new Map<string, MaterialUsageGroup>();

  for (const usage of materialUsages) {
    const identity = usage.inventory_item_id
      ? `inventory:${usage.inventory_item_id}`
      : `usage:${usage.id}`;
    const key = [
      identity,
      Number(usage.unit_price || 0).toFixed(6),
      usage.billable ? "billable" : "not-billed",
    ].join("|");

    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, {
        key,
        description: usage.description,
        quantity: Number(usage.quantity || 0),
        quantityReturned: Number(usage.quantity_returned || 0),
        unitPrice: Number(usage.unit_price || 0),
        billable: usage.billable,
        usages: [usage],
      });
      continue;
    }

    existing.quantity += Number(usage.quantity || 0);
    existing.quantityReturned += Number(usage.quantity_returned || 0);
    existing.usages.push(usage);
  }

  return [...groups.values()];
}

export function WorkOrderOverview({
  order,
  customer,
  site,
  assignments,
  timeEntries,
  visibleTechnicianId,
  currentTimeMs,
  profileMap,
  canCorrectTime,
  canRecoverBilling,
  materialUsages,
  canManageMaterials,
  onAddMaterial,
  onReturnMaterial,
  onAddTime,
  onCorrectTime,
  onRecoverBilling,
}: {
  order: DbWorkOrder;
  customer: DbCustomer | null;
  site: DbSite | null;
  assignments: DbAssignment[];
  timeEntries: DbTimeEntry[];
  visibleTechnicianId: string | null;
  currentTimeMs: number | null;
  profileMap: Map<string, DbProfile>;
  canCorrectTime: boolean;
  canRecoverBilling: boolean;
  materialUsages: DbMaterialUsage[];
  canManageMaterials: boolean;
  onAddMaterial: () => void;
  onReturnMaterial: (usage: DbMaterialUsage) => void;
  onAddTime: (presetActivity?: "work" | "break") => void;
  onCorrectTime: (entry: DbTimeEntry) => void;
  onRecoverBilling: () => void;
}) {
  const groupedMaterialUsages = groupMaterialUsages(materialUsages);

  // The parent already supplies the current assignment for active jobs or the
  // final historical primary assignment for completed/Billing Ready jobs. Do
  // not discard a completed assignment here or the UI falsely says Unassigned.
  const displayAssignments = assignments.filter(
    (assignment) => !["removed", "declined"].includes(assignment.assignment_status)
  );

  // Keep all work-order time for billing/review logic, but the normal
  // Work Order view only displays the latest/current assigned technician.
  // Previous technicians remain preserved for Audit Report/history.
  const allSortedTimeEntries = [...timeEntries].sort(
    (a, b) =>
      new Date(a.started_at).getTime() -
      new Date(b.started_at).getTime()
  );

  const sortedTimeEntries = visibleTechnicianId
    ? allSortedTimeEntries.filter(
        (entry) =>
          entry.technician_id === visibleTechnicianId
      )
    : [];

  const terminalStatus =
    isTerminalWorkOrderStatus(order.status);

  const hasOpenTime = allSortedTimeEntries.some(
    (entry) => entry.ended_at === null
  );

  const hasBillableTime = allSortedTimeEntries.some(
    (entry) => entry.billable
  );
  const billingStatus =
    order.billing_status ?? "not_billed";

  const reviewFlags: string[] = [];

  if (terminalStatus && allSortedTimeEntries.length === 0) {
    reviewFlags.push(
      "Missing actual technician time"
    );
  }

  if (terminalStatus && hasOpenTime) {
    reviewFlags.push(
      "Technician clock is still open on a finished/closed work order"
    );
  }

  if (
    order.status === "closed" &&
    hasBillableTime &&
    !["ready", "billed", "waived"].includes(
      billingStatus
    )
  ) {
    reviewFlags.push(
      "Billable labour exists but the closed work order is not in billing"
    );
  }

  if (billingStatus === "review_required") {
    reviewFlags.push(
      "Billing requires review because approved time changed after billing"
    );
  }

  const actualMinutes = sortedTimeEntries.reduce((total, entry) => {
    if (entry.duration_minutes !== null) {
      return total + entry.duration_minutes;
    }

    if (currentTimeMs === null) return total;

    return (
      total +
      Math.max(
        0,
        Math.round(
          (currentTimeMs - new Date(entry.started_at).getTime()) / 60000
        )
      )
    );
  }, 0);


  const workLabourMinutes = sortedTimeEntries.reduce((total, entry) => {
    if (entry.activity_type !== "work") return total;

    const duration =
      entry.duration_minutes !== null
        ? entry.duration_minutes
        : currentTimeMs === null
        ? 0
        : Math.max(
            0,
            Math.round(
              (currentTimeMs - new Date(entry.started_at).getTime()) / 60000
            )
          );

    return total + duration;
  }, 0);

  const breakMinutes = sortedTimeEntries.reduce((total, entry) => {
    if (entry.activity_type !== "break") return total;
    return total + (entry.duration_minutes ?? 0);
  }, 0);

  const waitingMinutes = sortedTimeEntries.reduce((total, entry) => {
    if (entry.activity_type !== "waiting") return total;
    return total + (entry.duration_minutes ?? 0);
  }, 0);

  return (
    <div className="space-y-5">
      {reviewFlags.length > 0 && (
        <section className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-xs font-black uppercase text-amber-700 dark:text-amber-300">
                Record Review Required
              </div>
              <div className="mt-2 space-y-1 text-sm">
                {reviewFlags.map((flag) => (
                  <div key={flag}>• {flag}</div>
                ))}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              {canCorrectTime && (
                <button
                  type="button"
                  onClick={() => onAddTime("work")}
                  className="h-9 border border-amber-500/40 bg-background px-3 text-xs font-bold"
                >
                  Add / Repair Time
                </button>
              )}
              {canRecoverBilling &&
                order.status === "closed" &&
                !["ready", "billed", "waived"].includes(
                  billingStatus
                ) && (
                  <button
                    type="button"
                    onClick={onRecoverBilling}
                    className="h-9 border border-cyan-500/40 bg-cyan-500/10 px-3 text-xs font-bold text-cyan-700 dark:text-cyan-300"
                  >
                    Recover Billing
                  </button>
                )}
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <InfoCard
          icon={Building2}
          label="Customer"
          value={customer?.name ?? "Unknown customer"}
          subvalue={site ? [site.name, site.city].filter(Boolean).join(" · ") : "No site selected"}
        />
        <InfoCard
          icon={CalendarDays}
          label="Scheduled"
          value={formatLocalDateTime(order.scheduled_start)}
          subvalue={
            order.scheduled_end
              ? `Ends ${formatLocalDateTime(order.scheduled_end)}`
              : "No end time"
          }
        />
        <InfoCard
          icon={UserRound}
          label="Assigned technician"
          value={
            displayAssignments.length
              ? profileMap.get(displayAssignments[0].technician_id)?.full_name ??
                profileMap.get(displayAssignments[0].technician_id)?.email ??
                "Technician"
              : "Unassigned"
          }
          subvalue={
            displayAssignments.length > 1
              ? `${displayAssignments.length} technicians recorded`
              : displayAssignments[0]?.assignment_status === "completed"
              ? "Final technician · completed"
              : displayAssignments[0]?.assignment_status
              ? statusLabel(displayAssignments[0].assignment_status === "accepted" ? "assigned" : displayAssignments[0].assignment_status)
              : "Dispatch required"
          }
        />
        <InfoCard
          icon={Clock3}
          label="Estimated duration"
          value={minutesLabel(order.estimated_duration_minutes)}
          subvalue={order.service_area || "No service area"}
        />
        <InfoCard
          icon={ReceiptText}
          label="Billing"
          value={billingStatusLabel(billingStatus)}
          subvalue={
            order.billed_at
              ? `Billed ${formatCompactDateTime(order.billed_at)}`
              : order.billing_ready_at
              ? `Ready ${formatCompactDateTime(order.billing_ready_at)}`
              : "No billing completion recorded"
          }
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
        <section className="rounded-xl border border-border">
          <div className="border-b border-border bg-muted/40 px-4 py-3 text-xs font-black uppercase tracking-wider">
            Job Description
          </div>
          <div className="p-4 text-sm leading-6">
            {order.description || "No description provided."}
          </div>
        </section>

        <section className="rounded-xl border border-border">
          <div className="border-b border-border bg-muted/40 px-4 py-3 text-xs font-black uppercase tracking-wider">
            Job Details
          </div>
          <div className="divide-y divide-border text-sm">
            <DetailRow label="Job type" value={order.job_type || "General service"} />
            <DetailRow label="Source" value={statusLabel(order.source)} />
            <DetailRow label="Requested" value={formatLocalDateTime(order.requested_at)} />
            <DetailRow label="Customer PO" value={order.customer_po || "None"} />
            <DetailRow label="Travel distance" value={`${Number(order.travel_distance_km || 0).toFixed(2)} km`} />
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-border">
        <div className="border-b border-border bg-muted/40 px-4 py-3 text-xs font-black uppercase tracking-wider">
          Skills & Assignment
        </div>
        <div className="grid gap-4 p-4 md:grid-cols-2">
          <div>
            <div className="text-[10px] font-black uppercase text-muted-foreground">
              Required skills
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {(order.required_skills ?? []).length ? (
                (order.required_skills ?? []).map((skill) => (
                  <span
                    key={skill}
                    className="rounded-lg border border-primary/30 bg-primary/[0.06] px-2 py-1 text-[10px] font-bold text-primary"
                  >
                    {skill}
                  </span>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">No skills specified.</span>
              )}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-black uppercase text-muted-foreground">
              Assigned staff
            </div>
            <div className="mt-2 space-y-2">
              {displayAssignments.length ? (
                displayAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2"
                  >
                    <div>
                      <div className="text-xs font-bold">
                        {profileMap.get(assignment.technician_id)?.full_name ??
                          profileMap.get(assignment.technician_id)?.email ??
                          "Technician"}
                      </div>
                      <div className="mt-0.5 text-[10px] text-muted-foreground">
                        {statusLabel(assignment.assignment_role)} ·{" "}
                        {assignment.assignment_status === "completed"
                          ? "Completed / Final technician"
                          : assignment.assignment_status === "accepted"
                          ? "Assigned"
                          : statusLabel(assignment.assignment_status)}
                        {assignment.assigned_at
                          ? ` · assigned ${formatCompactDateTime(assignment.assigned_at)}`
                          : ""}
                      </div>
                    </div>
                    <div className="text-right text-[10px] text-muted-foreground">
                      {formatCompactDateTime(assignment.scheduled_start)}
                    </div>
                  </div>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">
                  No technician assigned.
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-3">
          <div>
            <div className="text-xs font-black uppercase tracking-wider">Materials Used</div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">Inventory consumption is the source of truth. Returned quantity is removed from the bill.</div>
          </div>
          {canManageMaterials && ["working", "waiting", "on_site", "billing_ready"].includes(order.status) ? (
            <button type="button" onClick={onAddMaterial} className="inline-flex h-9 items-center gap-2 rounded-xl border border-primary/40 bg-primary/[0.06] px-3 text-xs font-black text-primary">
              <PackagePlus className="h-4 w-4" /> Add from Inventory
            </button>
          ) : null}
        </div>
        {groupedMaterialUsages.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">No materials have been consumed on this Work Order.</div>
        ) : (
          <div className="divide-y divide-border">
            {groupedMaterialUsages.map((group) => {
              const net = Math.max(0, group.quantity - group.quantityReturned);
              const returnTarget = group.usages.find(
                (usage) => Math.max(0, Number(usage.quantity) - Number(usage.quantity_returned || 0)) > 0,
              ) ?? null;

              return (
                <div key={group.key} className="grid gap-3 px-4 py-3 md:grid-cols-[1fr_100px_120px_100px_120px] md:items-center">
                  <div>
                    <div className="text-sm font-bold">{group.description}</div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground">
                      Used {group.quantity.toFixed(2)} · Returned {group.quantityReturned.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-xs font-black">Net {net.toFixed(2)}</div>
                  <div className="text-xs">${group.unitPrice.toFixed(2)} / unit</div>
                  <div className={`text-[10px] font-black uppercase ${group.billable ? "text-primary" : "text-muted-foreground"}`}>
                    {group.billable ? "Billable" : "Not billed"}
                  </div>
                  <div>
                    {canManageMaterials && net > 0 && returnTarget ? (
                      <button
                        type="button"
                        onClick={() => onReturnMaterial(returnTarget)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2 text-[10px] font-black hover:bg-muted"
                        title={group.usages.length > 1 ? "Returns are recorded against the underlying stock usage records one batch at a time." : "Return material"}
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Return
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-3">
          <div className="text-xs font-black uppercase tracking-wider">
            Latest Assigned Technician Time
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-[10px] font-bold text-muted-foreground">
              Work {minutesLabel(workLabourMinutes)}
            </div>
            <div className="text-[10px] font-bold text-muted-foreground">
              Break {minutesLabel(breakMinutes)}
            </div>
            {waitingMinutes > 0 && (
              <div className="text-[10px] font-bold text-muted-foreground">
                Waiting {minutesLabel(waitingMinutes)}
              </div>
            )}
            <div className="text-xs font-black text-primary">
              {minutesLabel(actualMinutes)} recorded
            </div>
            {canCorrectTime && (
              <>
                <button
                  type="button"
                  onClick={() => onAddTime("work")}
                  className="h-8 border border-primary/40 bg-primary/[0.06] px-3 text-[10px] font-black text-primary"
                >
                  + Work Segment
                </button>
                <button
                  type="button"
                  onClick={() => onAddTime("break")}
                  className="h-8 border border-slate-500/40 px-3 text-[10px] font-black"
                >
                  + Break / Lunch
                </button>
              </>
            )}
          </div>
        </div>

        {sortedTimeEntries.length === 0 ? (
          <div className="flex flex-col gap-3 p-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              {visibleTechnicianId
                ? "No actual technician time has been recorded for the latest assigned technician."
                : "No technician is currently assigned. Previous technician records are available in the Audit Report."}
            </span>
            {canCorrectTime && (
              <button
                type="button"
                onClick={() => onAddTime("work")}
                className="h-9 shrink-0 border border-primary/40 px-3 text-xs font-bold text-primary"
              >
                Add Missing Time
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sortedTimeEntries.map((entry) => {
              const technician = profileMap.get(entry.technician_id);
              const duration =
                entry.duration_minutes !== null
                  ? entry.duration_minutes
                  : currentTimeMs === null
                  ? 0
                  : Math.max(
                      0,
                      Math.round(
                        (currentTimeMs - new Date(entry.started_at).getTime()) /
                          60000
                      )
                    );

              return (
                <div
                  key={entry.id}
                  className="grid gap-3 px-4 py-3 md:grid-cols-[1fr_110px_180px_100px_100px_86px] md:items-center"
                >
                  <div>
                    <div className="text-xs font-bold">
                      {technician?.full_name ?? technician?.email ?? "Technician"}
                    </div>
                    <div className="mt-1 text-[10px] font-black uppercase text-primary">
                      {statusLabel(entry.activity_type)}
                      {entry.ended_at === null ? " · ACTIVE" : ""}
                    </div>
                  </div>

                  <div className="text-xs font-bold">{minutesLabel(duration)}</div>

                  <div className="text-[10px] text-muted-foreground">
                    {formatLocalDateTime(entry.started_at)}
                    <br />
                    {entry.ended_at
                      ? `to ${formatLocalDateTime(entry.ended_at)}`
                      : "to NOW"}
                  </div>

                  <div className="text-[10px] font-bold">
                    {entry.billable ? "Billable" : "Non-billable"}
                  </div>

                  <div className="text-[10px] font-bold uppercase text-muted-foreground">
                    {entry.approval_status}
                  </div>

                  <div>
                    {canCorrectTime ? (
                      <button
                        type="button"
                        onClick={() => onCorrectTime(entry)}
                        className="h-8 border border-border px-2 text-[10px] font-bold hover:bg-muted"
                      >
                        Correct
                      </button>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">
                        Locked
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {(order.completion_summary || order.internal_notes) && (
        <section className="grid gap-4 md:grid-cols-2">
          {order.completion_summary && (
            <div className="rounded-xl border border-border p-4">
              <div className="text-[10px] font-black uppercase text-muted-foreground">
                Completion Summary
              </div>
              <div className="mt-2 text-sm leading-5">{order.completion_summary}</div>
            </div>
          )}
          {order.internal_notes && (
            <div className="rounded-xl border border-border p-4">
              <div className="text-[10px] font-black uppercase text-muted-foreground">
                Internal Notes
              </div>
              <div className="mt-2 text-sm leading-5">{order.internal_notes}</div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
