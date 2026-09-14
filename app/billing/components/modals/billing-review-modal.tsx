"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FilePenLine,
  ReceiptText,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import type {
  DbInventoryItem,
  DbInvoice,
  DbInvoiceItem,
  DbMaterialUsage,
  DbProfile,
  DbWorkOrder,
} from "../../types";
import { formatDateTime, money } from "../../utils";

type ReviewEvent = {
  id: string;
  event_type: string;
  details: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
};

type MaterialDiff = {
  key: string;
  name: string;
  invoiceQty: number;
  currentQty: number;
  unitPrice: number;
  invoiceAmount: number;
  currentAmount: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function humanActivity(value: unknown) {
  const raw = asString(value);
  if (!raw) return "—";
  return raw.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function boolLabel(value: unknown) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "—";
}

function dateValue(value: unknown) {
  const raw = asString(value);
  return raw ? formatDateTime(raw) : "—";
}

function reviewReasonCopy(reason: string) {
  switch (reason) {
    case "material_usage_changed_after_billing":
      return {
        title: "Materials changed after billing",
        explanation:
          "Work Order material usage changed after the invoice had already moved into billing. The customer-facing invoice may no longer match what was consumed, returned, or marked billable.",
        why:
          "A billed invoice should never silently drift away from the operational material record.",
        recommendation:
          "Compare Invoice vs Current Work Order below. If the invoice is already approved, sent, or partially paid, correct the financial difference with Credit / Charge rather than rewriting history.",
      };
    case "technician_time_changed_after_billing":
      return {
        title: "Technician time changed after billing",
        explanation:
          "A technician time segment was corrected after billing. Labour or travel charges may now differ from the audited actual-time record.",
        why:
          "Labour and travel billing must remain traceable to the technician's actual recorded time.",
        recommendation:
          "Review the Before → After time values. If the financial amount changed on a finalized invoice, use Credit / Charge to correct the customer balance.",
      };
    case "missing_time_added_after_billing":
      return {
        title: "Missing technician time added after billing",
        explanation:
          "Historical technician time was added after this invoice had already moved into billing.",
        why:
          "The original invoice may not include the newly recorded labour or travel.",
        recommendation:
          "Review the added time and its billable/rate fields. Post a Charge only if the customer should be billed for the newly recovered time.",
      };
    case "travel_distance_changed_after_billing":
      return {
        title: "Travel distance changed after billing",
        explanation:
          "The Work Order travel distance changed after billing. Distance-based travel charges may no longer match the invoice.",
        why:
          "Travel billing should reflect the source distance used for the financial record.",
        recommendation:
          "Compare the old and new distance and the travel line on the invoice. Use Credit / Charge if the finalized amount must change.",
      };
    default:
      return {
        title: "Billing source changed after billing",
        explanation:
          "A source record linked to this invoice changed after billing.",
        why:
          "The invoice should be reviewed so operational data and the financial record remain consistent.",
        recommendation:
          "Inspect the recorded change and compare it with the current invoice before resolving the review.",
      };
  }
}

export function BillingReviewModal({
  open,
  invoice,
  workOrder,
  items,
  materialUsages,
  inventoryItems,
  profiles,
  canManageBilling,
  onClose,
  onOpenEditInvoice,
  onOpenAdjustment,
  onResolved,
}: {
  open: boolean;
  invoice: DbInvoice;
  workOrder: DbWorkOrder;
  items: DbInvoiceItem[];
  materialUsages: DbMaterialUsage[];
  inventoryItems: DbInventoryItem[];
  profiles: DbProfile[];
  canManageBilling: boolean;
  onClose: () => void;
  onOpenEditInvoice: () => void;
  onOpenAdjustment: () => void;
  onResolved: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [reviewEvents, setReviewEvents] = useState<ReviewEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    setLoading(true);
    setLoadError(null);
    setResolveError(null);

    void (async () => {
      const { data, error } = await supabase
        .from("work_order_events")
        .select("id,event_type,details,created_by,created_at")
        .eq("work_order_id", workOrder.id)
        .eq("event_type", "billing_review_required")
        .order("created_at", { ascending: false })
        .limit(25);

      if (cancelled) return;

      if (error) {
        setReviewEvents([]);
        setLoadError(error.message);
      } else {
        setReviewEvents((data ?? []) as ReviewEvent[]);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, supabase, workOrder.id]);

  const latest = reviewEvents[0] ?? null;
  const details = latest?.details ?? {};
  const reason = asString(details.reason) || "unknown";
  const copy = reviewReasonCopy(reason);
  const before = asRecord(details.before);
  const after = asRecord(details.after);
  const actorId =
    asString(details.changed_by) ||
    asString(details.corrected_by) ||
    latest?.created_by ||
    "";
  const actor = actorId
    ? profiles.find((profile) => profile.id === actorId)?.full_name ||
      profiles.find((profile) => profile.id === actorId)?.email ||
      "User"
    : "System";

  const materialDiffs = useMemo<MaterialDiff[]>(() => {
    if (reason !== "material_usage_changed_after_billing") return [];

    const usageById = new Map(materialUsages.map((usage) => [usage.id, usage]));
    const itemById = new Map(inventoryItems.map((item) => [item.id, item]));

    const invoiceMap = new Map<
      string,
      { qty: number; amount: number; unitPrice: number; name: string }
    >();

    for (const line of items) {
      if (
        line.line_type !== "material" ||
        line.source_type !== "material_usage" ||
        !line.source_id
      ) {
        continue;
      }

      const usage = usageById.get(line.source_id);
      const key =
        usage?.inventory_item_id ||
        `description:${line.description.toLowerCase()}|${Number(line.unit_price).toFixed(6)}`;
      const name =
        (usage?.inventory_item_id
          ? itemById.get(usage.inventory_item_id)?.name
          : null) ||
        line.description;

      const existing = invoiceMap.get(key) ?? {
        qty: 0,
        amount: 0,
        unitPrice: Number(line.unit_price || 0),
        name,
      };

      existing.qty += Number(line.quantity || 0);
      existing.amount += Number(line.line_total || 0);
      invoiceMap.set(key, existing);
    }

    const currentMap = new Map<
      string,
      { qty: number; amount: number; unitPrice: number; name: string }
    >();

    for (const usage of materialUsages) {
      if (!usage.billable) continue;
      const net = Math.max(
        0,
        Number(usage.quantity || 0) - Number(usage.quantity_returned || 0)
      );
      if (net <= 0) continue;

      const key =
        usage.inventory_item_id ||
        `description:${usage.description.toLowerCase()}|${Number(usage.unit_price).toFixed(6)}`;
      const name =
        (usage.inventory_item_id
          ? itemById.get(usage.inventory_item_id)?.name
          : null) || usage.description;

      const existing = currentMap.get(key) ?? {
        qty: 0,
        amount: 0,
        unitPrice: Number(usage.unit_price || 0),
        name,
      };

      existing.qty += net;
      existing.amount += net * Number(usage.unit_price || 0);
      currentMap.set(key, existing);
    }

    const keys = new Set([...invoiceMap.keys(), ...currentMap.keys()]);
    return Array.from(keys)
      .map((key) => {
        const inv = invoiceMap.get(key);
        const current = currentMap.get(key);
        return {
          key,
          name: current?.name || inv?.name || "Material",
          invoiceQty: inv?.qty ?? 0,
          currentQty: current?.qty ?? 0,
          unitPrice: current?.unitPrice ?? inv?.unitPrice ?? 0,
          invoiceAmount: inv?.amount ?? 0,
          currentAmount: current?.amount ?? 0,
        };
      })
      .filter(
        (row) =>
          Math.abs(row.invoiceQty - row.currentQty) > 0.000001 ||
          Math.abs(row.invoiceAmount - row.currentAmount) > 0.005
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [inventoryItems, items, materialUsages, reason]);

  const materialFinancialDifference = materialDiffs.reduce(
    (sum, row) => sum + (row.currentAmount - row.invoiceAmount),
    0
  );

  async function resolveReview() {
    if (!canManageBilling) return;
    if (resolutionNote.trim().length < 5) {
      setResolveError("Enter a resolution note of at least 5 characters.");
      return;
    }

    setResolving(true);
    setResolveError(null);

    const { error } = await supabase.rpc("fieldops_resolve_billing_review", {
      p_work_order_id: workOrder.id,
      p_note: resolutionNote.trim(),
    });

    setResolving(false);

    if (error) {
      setResolveError(error.message);
      return;
    }

    onResolved();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120000] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close billing review"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />

      <section className="relative z-10 flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-600">
              Billing Review
            </div>
            <h2 className="mt-1 text-xl font-black">{invoice.invoice_number}</h2>
            <div className="mt-1 text-xs text-muted-foreground">
              {workOrder.work_order_number} · {copy.title}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="rounded-xl border border-border p-8 text-center text-sm text-muted-foreground">
              Loading review issue…
            </div>
          ) : (
            <div className="space-y-5">
              {loadError ? (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-200">
                  {loadError}
                </div>
              ) : null}

              <section className="rounded-xl border border-rose-500/35 bg-rose-500/[0.06] p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                  <div>
                    <div className="font-black">{copy.title}</div>
                    <div className="mt-1 text-sm leading-6 text-muted-foreground">
                      {copy.explanation}
                    </div>
                    {latest ? (
                      <div className="mt-3 text-xs text-muted-foreground">
                        Raised {formatDateTime(latest.created_at)} · {actor}
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>

              {reason === "material_usage_changed_after_billing" ? (
                <section className="rounded-xl border border-border">
                  <div className="border-b border-border px-4 py-3">
                    <div className="text-sm font-black">What changed</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Invoice material lines compared with the current Work Order material record.
                    </div>
                  </div>

                  {materialDiffs.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground">
                      No present material quantity difference is detectable. This can happen when the source was changed and then changed back. The review remains valid because the post-billing change is still part of the audit history.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[760px] text-left">
                        <thead className="bg-muted/40 text-[10px] font-black uppercase text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2">Item</th>
                            <th className="px-3 py-2 text-right">Invoice</th>
                            <th className="px-3 py-2 text-right">Current WO</th>
                            <th className="px-3 py-2 text-right">Difference</th>
                            <th className="px-3 py-2 text-right">Financial impact</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {materialDiffs.map((row) => (
                            <tr key={row.key}>
                              <td className="px-3 py-3">
                                <div className="text-sm font-bold">{row.name}</div>
                                <div className="text-[10px] text-muted-foreground">
                                  {money(row.unitPrice, invoice.currency)} / ea
                                </div>
                              </td>
                              <td className="px-3 py-3 text-right text-sm font-semibold">
                                {row.invoiceQty} ea
                              </td>
                              <td className="px-3 py-3 text-right text-sm font-semibold">
                                {row.currentQty} ea
                              </td>
                              <td className="px-3 py-3 text-right text-sm font-black">
                                {(row.currentQty - row.invoiceQty) > 0 ? "+" : ""}
                                {(row.currentQty - row.invoiceQty).toFixed(2).replace(/\.00$/, "")} ea
                              </td>
                              <td
                                className={`px-3 py-3 text-right text-sm font-black ${
                                  row.currentAmount - row.invoiceAmount < 0
                                    ? "text-emerald-600"
                                    : row.currentAmount - row.invoiceAmount > 0
                                    ? "text-rose-600"
                                    : ""
                                }`}
                              >
                                {(row.currentAmount - row.invoiceAmount) > 0 ? "+" : ""}
                                {money(
                                  row.currentAmount - row.invoiceAmount,
                                  invoice.currency
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <div className="flex justify-end border-t border-border p-3 text-sm">
                        <span className="mr-3 text-muted-foreground">Net source difference</span>
                        <span className="font-black">
                          {materialFinancialDifference > 0 ? "+" : ""}
                          {money(materialFinancialDifference, invoice.currency)}
                        </span>
                      </div>
                    </div>
                  )}
                </section>
              ) : null}

              {(reason === "technician_time_changed_after_billing" ||
                reason === "missing_time_added_after_billing") ? (
                <section className="rounded-xl border border-border p-4">
                  <div className="text-sm font-black">Before → After</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Recorded technician-time change that triggered the billing review.
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl bg-muted/25 p-3">
                      <div className="text-[10px] font-black uppercase text-muted-foreground">
                        Before
                      </div>
                      {before ? (
                        <div className="mt-2 space-y-1.5 text-xs">
                          <div>Activity: <b>{humanActivity(before.activity_type)}</b></div>
                          <div>Start: <b>{dateValue(before.started_at)}</b></div>
                          <div>End: <b>{dateValue(before.ended_at)}</b></div>
                          <div>Billable: <b>{boolLabel(before.billable)}</b></div>
                          <div>Billing rate: <b>{money(asNumber(before.billing_rate), invoice.currency)}</b></div>
                        </div>
                      ) : (
                        <div className="mt-2 text-xs text-muted-foreground">
                          No prior segment — this time was added after billing.
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl bg-muted/25 p-3">
                      <div className="text-[10px] font-black uppercase text-muted-foreground">
                        After
                      </div>
                      {after ? (
                        <div className="mt-2 space-y-1.5 text-xs">
                          <div>Activity: <b>{humanActivity(after.activity_type)}</b></div>
                          <div>Start: <b>{dateValue(after.started_at)}</b></div>
                          <div>End: <b>{dateValue(after.ended_at)}</b></div>
                          <div>Billable: <b>{boolLabel(after.billable)}</b></div>
                          <div>Billing rate: <b>{money(asNumber(after.billing_rate), invoice.currency)}</b></div>
                        </div>
                      ) : (
                        <div className="mt-2 text-xs text-muted-foreground">No after-values recorded.</div>
                      )}
                    </div>
                  </div>

                  {asString(details.correction_reason) ? (
                    <div className="mt-3 text-xs text-muted-foreground">
                      Correction reason: <b className="text-foreground">{asString(details.correction_reason)}</b>
                    </div>
                  ) : null}
                </section>
              ) : null}

              {reason === "travel_distance_changed_after_billing" ? (
                <section className="rounded-xl border border-border p-4">
                  <div className="text-sm font-black">Travel distance change</div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl bg-muted/25 p-3 text-sm">
                      <div className="text-[10px] font-black uppercase text-muted-foreground">
                        Before
                      </div>
                      <div className="mt-2 font-black">
                        {asNumber(before?.travel_distance_km).toFixed(2)} km
                      </div>
                    </div>
                    <div className="rounded-xl bg-muted/25 p-3 text-sm">
                      <div className="text-[10px] font-black uppercase text-muted-foreground">
                        Current
                      </div>
                      <div className="mt-2 font-black">
                        {asNumber(after?.travel_distance_km).toFixed(2)} km
                      </div>
                    </div>
                  </div>
                </section>
              ) : null}

              <section className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-border p-4">
                  <div className="text-[10px] font-black uppercase text-muted-foreground">
                    Why review
                  </div>
                  <div className="mt-2 text-sm leading-6">{copy.why}</div>
                </div>

                <div className="rounded-xl border border-border p-4">
                  <div className="text-[10px] font-black uppercase text-muted-foreground">
                    Recommended action
                  </div>
                  <div className="mt-2 text-sm leading-6">{copy.recommendation}</div>
                </div>
              </section>

              <section className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenEditInvoice();
                    }}
                    className="inline-flex h-9 items-center gap-2 rounded-xl border border-border px-3 text-xs font-black hover:bg-muted"
                  >
                    <FilePenLine className="h-4 w-4" />
                    Open Edit Invoice
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAdjustment();
                    }}
                    className="inline-flex h-9 items-center gap-2 rounded-xl border border-border px-3 text-xs font-black hover:bg-muted"
                  >
                    <ReceiptText className="h-4 w-4" />
                    Credit / Charge
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      window.location.assign(
                        `/work-orders?focus=${encodeURIComponent(workOrder.id)}&return=billing`
                      )
                    }
                    className="inline-flex h-9 items-center gap-2 rounded-xl border border-border px-3 text-xs font-black hover:bg-muted"
                  >
                    <ClipboardList className="h-4 w-4" />
                    Open Work Order
                  </button>
                </div>
              </section>

              {canManageBilling ? (
                <section className="rounded-xl border border-border p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                    <div className="flex-1">
                      <div className="text-sm font-black">Resolve review</div>
                      <div className="mt-1 text-xs leading-5 text-muted-foreground">
                        Opening this popup does not resolve the issue. Resolve only after you have checked the difference and completed any required Credit / Charge or operational correction.
                      </div>

                      <textarea
                        value={resolutionNote}
                        onChange={(event) => setResolutionNote(event.target.value)}
                        placeholder="Resolution note — what did you verify or correct?"
                        className="mt-3 min-h-20 w-full rounded-xl border border-border bg-card p-3 text-sm"
                      />

                      {resolveError ? (
                        <div className="mt-2 text-xs font-semibold text-rose-600">
                          {resolveError}
                        </div>
                      ) : null}

                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          disabled={resolving}
                          onClick={() => void resolveReview()}
                          className="h-9 rounded-xl bg-emerald-600 px-4 text-xs font-black text-white disabled:opacity-50"
                        >
                          {resolving ? "Resolving…" : "Resolve Review"}
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              ) : null}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
