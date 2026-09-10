import type { EditWorkOrderForm } from "../types";
import { priorities } from "../constants";
import { statusLabel } from "../utils";

export function EditWorkOrderPanel({
  form,
  setForm,
  saving,
  onCancel,
  onSave,
}: {
  form: EditWorkOrderForm;
  setForm: (form: EditWorkOrderForm | null) => void;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  function update<K extends keyof EditWorkOrderForm>(
    key: K,
    value: EditWorkOrderForm[K]
  ) {
    setForm({ ...form, [key]: value });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="md:col-span-2">
          <span className="mb-1.5 block text-xs font-bold">Title</span>
          <input
            value={form.title}
            onChange={(event) => update("title", event.target.value)}
            className="h-11 w-full border border-border bg-card px-3 text-sm outline-none focus:border-primary"
          />
        </label>

        <label>
          <span className="mb-1.5 block text-xs font-bold">Job Type</span>
          <input
            value={form.jobType}
            onChange={(event) => update("jobType", event.target.value)}
            className="h-11 w-full border border-border bg-card px-3 text-sm outline-none focus:border-primary"
          />
        </label>

        <label>
          <span className="mb-1.5 block text-xs font-bold">Priority</span>
          <select
            value={form.priority}
            onChange={(event) => update("priority", event.target.value)}
            className="h-11 w-full border border-border bg-card px-3 text-sm outline-none focus:border-primary"
          >
            {priorities.map((priority) => (
              <option key={priority} value={priority}>
                {statusLabel(priority)}
              </option>
            ))}
          </select>
        </label>

        <label className="md:col-span-2">
          <span className="mb-1.5 block text-xs font-bold">Service Area</span>
          <input
            value={form.serviceArea}
            onChange={(event) => update("serviceArea", event.target.value)}
            className="h-11 w-full border border-border bg-card px-3 text-sm outline-none focus:border-primary"
          />
        </label>

        <div className="md:col-span-2 grid gap-3 border border-border bg-muted/20 p-4 sm:grid-cols-3">
          <label>
            <span className="mb-1.5 block text-xs font-bold">Date</span>
            <input
              type="date"
              value={form.scheduleDate}
              onChange={(event) => update("scheduleDate", event.target.value)}
              className="h-11 w-full border border-border bg-card px-3 text-sm outline-none focus:border-primary"
            />
          </label>

          <label>
            <span className="mb-1.5 block text-xs font-bold">Start</span>
            <input
              type="time"
              step={900}
              value={form.startTime}
              onChange={(event) => update("startTime", event.target.value)}
              className="h-11 w-full border border-border bg-card px-3 text-sm outline-none focus:border-primary"
            />
          </label>

          <label>
            <span className="mb-1.5 block text-xs font-bold">End</span>
            <input
              type="time"
              step={900}
              value={form.endTime}
              onChange={(event) => update("endTime", event.target.value)}
              className="h-11 w-full border border-border bg-card px-3 text-sm outline-none focus:border-primary"
            />
          </label>
        </div>

        <label className="md:col-span-2">
          <span className="mb-1.5 block text-xs font-bold">Description</span>
          <textarea
            rows={6}
            value={form.description}
            onChange={(event) => update("description", event.target.value)}
            className="w-full resize-y border border-border bg-card px-3 py-3 text-sm outline-none focus:border-primary"
          />
        </label>
      </div>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <button
          type="button"
          disabled={saving}
          onClick={onCancel}
          className="h-10 border border-border px-4 text-sm font-bold"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onSave}
          className="h-10 bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
