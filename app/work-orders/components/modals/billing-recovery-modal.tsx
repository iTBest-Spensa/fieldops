import { X } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type { DbWorkOrder } from "../../types";

type Props = { selectedOrder: DbWorkOrder; billingRecoveryError: string | null; billingRecoveryReason: string; setBillingRecoveryReason: Dispatch<SetStateAction<string>>; savingBillingRecovery: boolean; onClose: () => void; onSave: () => void; };

export function BillingRecoveryModal(props: Props) {
  const { selectedOrder, billingRecoveryError, billingRecoveryReason, setBillingRecoveryReason, savingBillingRecovery, onClose, onSave } = props;
  return (
    <div className="fixed inset-0 z-[120000] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close billing recovery"
        onClick={() => {
          if (!savingBillingRecovery) onClose();
        }}
        className="absolute inset-0 bg-black/60"
      />

      <section className="relative z-10 w-full max-w-[620px] border border-border bg-background p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-black text-cyan-600 dark:text-cyan-400">
              BILLING RECOVERY
            </div>
            <h3 className="mt-1 text-lg font-bold">
              Send Closed Work Order to Billing
            </h3>
            <div className="mt-1 text-sm text-muted-foreground">
              {selectedOrder.work_order_number} · {selectedOrder.title}
            </div>
          </div>
          <button
            type="button"
            disabled={savingBillingRecovery}
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center border border-border"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {billingRecoveryError && (
          <div className="mt-4 border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-500">
            {billingRecoveryError}
          </div>
        )}

        <div className="mt-4 border border-cyan-500/30 bg-cyan-500/10 p-3 text-xs text-cyan-700 dark:text-cyan-300">
          The work order remains Closed. This action only restores it to the
          billing queue, so operational history is not rewritten.
        </div>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-xs font-bold">
            Recovery Reason <span className="text-rose-500">*</span>
          </span>
          <textarea
            rows={4}
            value={billingRecoveryReason}
            onChange={(event) =>
              setBillingRecoveryReason(event.target.value)
            }
            placeholder="e.g. Work order was closed before billing was prepared."
            className="w-full border border-border bg-card p-3 text-sm"
          />
        </label>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={savingBillingRecovery}
            onClick={onClose}
            className="h-10 border border-border px-4 text-sm font-bold"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={savingBillingRecovery}
            onClick={onSave}
            className="h-10 bg-cyan-600 px-5 text-sm font-bold text-white disabled:opacity-40"
          >
            {savingBillingRecovery ? "Sending…" : "Send to Billing"}
          </button>
        </div>
      </section>
    </div>
  );
}
