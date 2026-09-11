"use client";
import { Banknote, CreditCard, MapPin, Timer } from "lucide-react";
import type { SettingsForm } from "../types";
import { Field, SectionCard, inputClass, selectClass, textareaClass } from "./section-card";

export function BillingPanel({ form, disabled, saving, onChange, onSave }: { form:SettingsForm; disabled:boolean; saving:boolean; onChange:(form:SettingsForm)=>void; onSave:()=>void }) {
  return <div className="space-y-5">
    <SectionCard title="Billing defaults" description="Defaults for future invoices. Customer-specific terms and invoice-specific edits can still override them.">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Default payment terms (days)"><input disabled={disabled} inputMode="numeric" className={inputClass} value={form.defaultPaymentTermsDays} onChange={e=>onChange({...form,defaultPaymentTermsDays:e.target.value})}/></Field>
        <Field label="Default tax rate (%)"><input disabled={disabled} inputMode="decimal" className={inputClass} value={form.defaultTaxRatePercent} onChange={e=>onChange({...form,defaultTaxRatePercent:e.target.value})}/></Field>
        <Field label="Default customer billing rate / hour" hint="Starting customer rate for new actual-time segments. It remains editable on each segment."><input disabled={disabled} inputMode="decimal" className={inputClass} value={form.defaultCustomerBillingRate} onChange={e=>onChange({...form,defaultCustomerBillingRate:e.target.value})}/></Field>
        <Field label="Default technician pay rate / hour" hint="Starting technician rate for new actual-time segments. It remains editable on each segment."><input disabled={disabled} inputMode="decimal" className={inputClass} value={form.defaultTechnicianPayRate} onChange={e=>onChange({...form,defaultTechnicianPayRate:e.target.value})}/></Field>
        <Field label="Minimum labour charged to client (minutes)" hint="0 disables the minimum. Actual technician time remains unchanged; Billing adds only the difference as a transparent minimum-charge line."><input disabled={disabled} inputMode="numeric" className={inputClass} value={form.minimumBillableMinutes} onChange={e=>onChange({...form,minimumBillableMinutes:e.target.value})}/></Field>
        <div className="md:col-span-2"><Field label="Invoice footer"><textarea disabled={disabled} className={textareaClass} value={form.invoiceFooter} onChange={e=>onChange({...form,invoiceFooter:e.target.value})} placeholder="Payment instructions, thank-you note, legal text…"/></Field></div>
      </div>
    </SectionCard>

    <SectionCard title="Travel charging" description="Choose how customer travel is billed. Technician travel time can still be recorded operationally even when customer travel charging is disabled.">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Charge travel by">
          <select disabled={disabled} className={selectClass} value={form.travelBillingMode} onChange={e=>onChange({...form,travelBillingMode:e.target.value as SettingsForm["travelBillingMode"]})}>
            <option value="time">Time</option><option value="distance">Distance (km)</option><option value="none">Do not charge travel</option>
          </select>
        </Field>
        {form.travelBillingMode === "time" ? <Field label="Travel hourly rate" hint="Leave blank to use each technician's normal customer billing rate."><div className="relative"><Timer className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground"/><input disabled={disabled} inputMode="decimal" className={`${inputClass} pl-10`} value={form.travelHourlyRate} onChange={e=>onChange({...form,travelHourlyRate:e.target.value})} placeholder="Use technician rate"/></div></Field> : null}
        {form.travelBillingMode === "distance" ? <Field label="Travel rate per km" hint="Distance is entered on the Work Order/Billing today. A future GPS layer can populate it automatically."><div className="relative"><MapPin className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground"/><input disabled={disabled} inputMode="decimal" className={`${inputClass} pl-10`} value={form.travelPerKmRate} onChange={e=>onChange({...form,travelPerKmRate:e.target.value})}/></div></Field> : null}
      </div>
    </SectionCard>

    <SectionCard title="Payment methods" description="FieldOps customer-facing payment terminology remains Cash and Tap."><div className="grid gap-3 sm:grid-cols-2"><div className="flex items-center gap-3 rounded-xl border border-border p-4"><Banknote className="h-5 w-5 text-primary"/><div><div className="font-black">Cash</div><div className="text-xs text-muted-foreground">Physical cash payment</div></div></div><div className="flex items-center gap-3 rounded-xl border border-border p-4"><CreditCard className="h-5 w-5 text-primary"/><div><div className="font-black">Tap</div><div className="text-xs text-muted-foreground">Card / terminal payment</div></div></div></div></SectionCard>
    <div className="flex justify-end"><button disabled={disabled||saving} onClick={onSave} className="h-11 rounded-xl bg-primary px-5 text-sm font-black text-primary-foreground disabled:opacity-50">{saving?"Saving…":"Save Billing Settings"}</button></div>
  </div>;
}
