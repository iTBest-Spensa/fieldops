"use client";

import { Clock3, MapPin, Play } from "lucide-react";
import type { DragJobPayload, WaitingJob } from "../types";

export function WaitingWorkPanel({
  loading,
  waitingJobs,
  selectedJob,
  focusJobUuid,
  focusPulse,
  canSelfClaim,
  canDragAssign,
  claimingJobUuid,
  onSelectJob,
  onClaimJob,
}: {
  loading: boolean;
  waitingJobs: WaitingJob[];
  selectedJob: WaitingJob | null;
  focusJobUuid: string | null;
  focusPulse: boolean;
  canSelfClaim: boolean;
  canDragAssign: boolean;
  claimingJobUuid: string | null;
  onSelectJob: (jobUuid: string) => void;
  onClaimJob: (job: WaitingJob) => void;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card/75 shadow-sm">
      <div className="border-b border-border px-4 py-4">
        <h2 className="font-bold">Waiting work</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Select one to compare dispatch fit.
          {canDragAssign ? " Drag it onto a technician track to assign." : ""}
          {canSelfClaim ? " Claim an available job to start Travel immediately." : ""}
        </p>
      </div>

      {loading ? (
        <div className="p-5 text-sm text-muted-foreground">Loading live work orders…</div>
      ) : waitingJobs.length === 0 ? (
        <div className="p-5 text-sm text-muted-foreground">
          No unassigned work orders are waiting.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {waitingJobs.map((job) => {
            const selected = job.uuid === selectedJob?.uuid;
            const focused = job.uuid === focusJobUuid;
            const claiming = job.uuid === claimingJobUuid;

            return (
              <div
                key={job.uuid}
                role="button"
                tabIndex={0}
                data-fieldops-work-order={job.uuid}
                draggable={canDragAssign}
                onDragStart={(event) => {
                  if (!canDragAssign) {
                    event.preventDefault();
                    return;
                  }
                  event.dataTransfer.effectAllowed = "move";
                  const payload: DragJobPayload = {
                    kind: "waiting",
                    jobUuid: job.uuid,
                  };
                  event.dataTransfer.setData(
                    "application/x-fieldops-job",
                    JSON.stringify(payload)
                  );
                  event.dataTransfer.setData("text/plain", job.uuid);
                }}
                onClick={() => onSelectJob(job.uuid)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectJob(job.uuid);
                  }
                }}
                className={`relative w-full cursor-pointer p-4 text-left transition ${
                  selected ? "bg-primary/[0.07]" : "hover:bg-row-hover"
                } ${
                  focused && focusPulse
                    ? "ring-2 ring-inset ring-primary animate-pulse"
                    : ""
                }`}
              >
                {focused && focusPulse && (
                  <span className="absolute right-3 top-3 border border-primary bg-background px-1.5 py-0.5 text-[8px] font-black text-primary animate-pulse">
                    THIS JOB
                  </span>
                )}

                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-black text-primary">{job.id}</span>
                  <span
                    className={`border px-2 py-1 text-[10px] font-bold rounded-none ${job.tone}`}
                  >
                    {job.priority}
                  </span>
                </div>
                <div className="mt-2 text-sm font-bold">{job.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{job.customer}</div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {job.place}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock3 className="h-3.5 w-3.5" />
                    {job.time}
                  </span>
                </div>

                {canSelfClaim && (
                  <button
                    type="button"
                    disabled={claiming}
                    onClick={(event) => {
                      event.stopPropagation();
                      onClaimJob(job);
                    }}
                    className="mt-3 inline-flex h-8 items-center gap-2 border border-primary/40 bg-primary/[0.06] px-3 text-[11px] font-black text-primary hover:bg-primary/10 disabled:opacity-50"
                  >
                    <Play className="h-3.5 w-3.5" />
                    {claiming ? "Claiming…" : "Claim & Start Travel"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
