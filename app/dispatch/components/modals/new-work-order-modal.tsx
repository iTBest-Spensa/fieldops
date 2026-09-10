"use client";

import type { Dispatch, SetStateAction } from "react";
import { X } from "lucide-react";
import type { DbCustomer, DbSite, NewWorkOrderForm } from "../../types";

export function NewWorkOrderModal({
  open,
  savingWorkOrder,
  newWorkOrderError,
  customerOptions,
  siteOptions,
  newWorkOrderForm,
  setNewWorkOrderForm,
  setNewWorkOrderOpen,
  onCreate,
}: {
  open: boolean;
  savingWorkOrder: boolean;
  newWorkOrderError: string | null;
  customerOptions: DbCustomer[];
  siteOptions: DbSite[];
  newWorkOrderForm: NewWorkOrderForm;
  setNewWorkOrderForm: Dispatch<SetStateAction<NewWorkOrderForm>>;
  setNewWorkOrderOpen: Dispatch<SetStateAction<boolean>>;
  onCreate: () => void;
}) {
  if (!open) return null;

  return (
            <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
              <button
                type="button"
                aria-label="Close new work order"
                onClick={() => {
                  if (!savingWorkOrder) setNewWorkOrderOpen(false);
                }}
                className="absolute inset-0 bg-black/50"
              />

              <section className="relative z-10 flex max-h-[90vh] w-full max-w-[820px] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-5">
                  <div>
                    <div className="text-xs font-semibold text-primary">Dispatch</div>
                    <h2 className="mt-1 text-xl font-bold">New Work Order</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Create a job and place it directly into Waiting work.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={savingWorkOrder}
                    onClick={() => setNewWorkOrderOpen(false)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5">
                  {newWorkOrderError && (
                    <div className="mb-4 border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-500">
                      {newWorkOrderError}
                    </div>
                  )}

                  {customerOptions.length === 0 ? (
                    <div className="border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-600 dark:text-amber-400">
                      No customers exist yet. Create a customer before creating a work order.
                    </div>
                  ) : (
                    <div className="grid gap-5 md:grid-cols-2">
                      <label className="md:col-span-2">
                        <span className="mb-1.5 block text-xs font-bold">
                          Work order title <span className="text-rose-500">*</span>
                        </span>
                        <input
                          autoFocus
                          value={newWorkOrderForm.title}
                          onChange={(event) =>
                            setNewWorkOrderForm((current) => ({
                              ...current,
                              title: event.target.value,
                            }))
                          }
                          placeholder="e.g. Replace failed workstation"
                          className="h-11 w-full border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                        />
                      </label>

                      <label>
                        <span className="mb-1.5 block text-xs font-bold">
                          Customer <span className="text-rose-500">*</span>
                        </span>
                        <select
                          value={newWorkOrderForm.customerId}
                          onChange={(event) => {
                            const customerId = event.target.value;
                            const matchingSites = siteOptions.filter(
                              (site) => site.customer_id === customerId
                            );
                            const firstSite = matchingSites[0] ?? null;

                            setNewWorkOrderForm((current) => ({
                              ...current,
                              customerId,
                              siteId: firstSite?.id ?? "",
                              serviceArea: firstSite?.city ?? "",
                            }));
                          }}
                          className="h-11 w-full border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                        >
                          <option value="">Select customer</option>
                          {customerOptions.map((customer) => (
                            <option key={customer.id} value={customer.id}>
                              {customer.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label>
                        <span className="mb-1.5 block text-xs font-bold">Site</span>
                        <select
                          value={newWorkOrderForm.siteId}
                          onChange={(event) => {
                            const siteId = event.target.value;
                            const site =
                              siteOptions.find((item) => item.id === siteId) ?? null;

                            setNewWorkOrderForm((current) => ({
                              ...current,
                              siteId,
                              serviceArea: site?.city ?? current.serviceArea,
                            }));
                          }}
                          className="h-11 w-full border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                        >
                          <option value="">No specific site</option>
                          {siteOptions
                            .filter(
                              (site) =>
                                !newWorkOrderForm.customerId ||
                                site.customer_id === newWorkOrderForm.customerId
                            )
                            .map((site) => (
                              <option key={site.id} value={site.id}>
                                {site.name}
                                {site.city ? ` · ${site.city}` : ""}
                              </option>
                            ))}
                        </select>
                      </label>

                      <label>
                        <span className="mb-1.5 block text-xs font-bold">Priority</span>
                        <select
                          value={newWorkOrderForm.priority}
                          onChange={(event) =>
                            setNewWorkOrderForm((current) => ({
                              ...current,
                              priority: event.target.value,
                            }))
                          }
                          className="h-11 w-full border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                        >
                          <option value="low">Low</option>
                          <option value="normal">Normal</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                          <option value="emergency">Emergency</option>
                        </select>
                      </label>

                      <label>
                        <span className="mb-1.5 block text-xs font-bold">Source</span>
                        <select
                          value={newWorkOrderForm.source}
                          onChange={(event) =>
                            setNewWorkOrderForm((current) => ({
                              ...current,
                              source: event.target.value,
                            }))
                          }
                          className="h-11 w-full border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                        >
                          <option value="office">Office</option>
                          <option value="phone">Phone</option>
                          <option value="email">Email</option>
                        </select>
                      </label>

                      <label>
                        <span className="mb-1.5 block text-xs font-bold">Job type</span>
                        <input
                          value={newWorkOrderForm.jobType}
                          onChange={(event) =>
                            setNewWorkOrderForm((current) => ({
                              ...current,
                              jobType: event.target.value,
                            }))
                          }
                          placeholder="e.g. Desktop Support"
                          className="h-11 w-full border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                        />
                      </label>

                      <label>
                        <span className="mb-1.5 block text-xs font-bold">Service area</span>
                        <input
                          value={newWorkOrderForm.serviceArea}
                          onChange={(event) =>
                            setNewWorkOrderForm((current) => ({
                              ...current,
                              serviceArea: event.target.value,
                            }))
                          }
                          placeholder="e.g. Downtown"
                          className="h-11 w-full border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                        />
                      </label>

                      <div className="md:col-span-2 grid gap-3 border border-border bg-muted/20 p-4 md:grid-cols-[1fr_1fr_180px]">
                        <label>
                          <span className="mb-1.5 block text-xs font-bold">
                            Schedule date
                          </span>
                          <input
                            type="date"
                            value={newWorkOrderForm.scheduleDate}
                            onChange={(event) =>
                              setNewWorkOrderForm((current) => ({
                                ...current,
                                scheduleDate: event.target.value,
                              }))
                            }
                            className="h-11 w-full border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                          />
                        </label>

                        <label>
                          <span className="mb-1.5 block text-xs font-bold">
                            Start time
                          </span>
                          <input
                            type="time"
                            step={900}
                            value={newWorkOrderForm.scheduleTime}
                            onChange={(event) =>
                              setNewWorkOrderForm((current) => ({
                                ...current,
                                scheduleTime: event.target.value,
                              }))
                            }
                            className="h-11 w-full border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                          />
                        </label>

                        <label>
                          <span className="mb-1.5 block text-xs font-bold">
                            Est. minutes
                          </span>
                          <input
                            type="number"
                            min={15}
                            step={15}
                            value={newWorkOrderForm.estimatedDurationMinutes}
                            onChange={(event) =>
                              setNewWorkOrderForm((current) => ({
                                ...current,
                                estimatedDurationMinutes: event.target.value,
                              }))
                            }
                            className="h-11 w-full border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                          />
                        </label>

                        <div className="md:col-span-3 text-[11px] text-muted-foreground">
                          Leave both schedule fields blank for an unscheduled job.
                        </div>
                      </div>

                      <label className="md:col-span-2">
                        <span className="mb-1.5 block text-xs font-bold">
                          Required skills
                        </span>
                        <input
                          value={newWorkOrderForm.requiredSkills}
                          onChange={(event) =>
                            setNewWorkOrderForm((current) => ({
                              ...current,
                              requiredSkills: event.target.value,
                            }))
                          }
                          placeholder="network, firewall, windows"
                          className="h-11 w-full border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                        />
                        <span className="mt-1 block text-[11px] text-muted-foreground">
                          Separate skills with commas. They are used by Dispatch Fit.
                        </span>
                      </label>

                      <label className="md:col-span-2">
                        <span className="mb-1.5 block text-xs font-bold">Description</span>
                        <textarea
                          rows={4}
                          value={newWorkOrderForm.description}
                          onChange={(event) =>
                            setNewWorkOrderForm((current) => ({
                              ...current,
                              description: event.target.value,
                            }))
                          }
                          placeholder="Describe the issue, request, access instructions or other dispatch details..."
                          className="w-full resize-y border border-border bg-card px-3 py-3 text-sm outline-none focus:border-primary"
                        />
                      </label>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/20 px-5 py-4">
                  <div className="text-[11px] text-muted-foreground">
                    FieldOps generates the work-order number automatically.
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={savingWorkOrder}
                      onClick={() => setNewWorkOrderOpen(false)}
                      className="h-10 border border-border px-4 text-sm font-bold disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={savingWorkOrder || customerOptions.length === 0}
                      onClick={onCreate}
                      className="h-10 bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-50"
                    >
                      {savingWorkOrder ? "Creating…" : "Create Work Order"}
                    </button>
                  </div>
                </div>
              </section>
            </div>
  );
}
