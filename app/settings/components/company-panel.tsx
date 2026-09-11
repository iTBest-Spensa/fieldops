"use client";

import { useMemo, useRef } from "react";
import { ImagePlus, Trash2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { SettingsForm } from "../types";
import { Field, SectionCard, inputClass } from "./section-card";

export function CompanyPanel({
  form,
  disabled,
  onChange,
  onSave,
  saving,
  logoBusy,
  onUploadLogo,
  onRemoveLogo,
}: {
  form: SettingsForm;
  disabled: boolean;
  saving: boolean;
  logoBusy: boolean;
  onChange: (form: SettingsForm) => void;
  onSave: () => void;
  onUploadLogo: (file: File) => void;
  onRemoveLogo: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const logoUrl = form.logoPath
    ? supabase.storage.from("company-branding").getPublicUrl(form.logoPath).data.publicUrl
    : null;

  return (
    <div className="space-y-5">
      <SectionCard
        title="Company profile"
        description="Business identity used throughout the application and future document/report templates."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Display name">
            <input
              disabled={disabled}
              className={inputClass}
              value={form.companyName}
              onChange={(e) => onChange({ ...form, companyName: e.target.value })}
            />
          </Field>
          <Field label="Legal name">
            <input
              disabled={disabled}
              className={inputClass}
              value={form.legalName}
              onChange={(e) => onChange({ ...form, legalName: e.target.value })}
            />
          </Field>
          <Field label="Business / tax number">
            <input
              disabled={disabled}
              className={inputClass}
              value={form.businessNumber}
              onChange={(e) => onChange({ ...form, businessNumber: e.target.value })}
            />
          </Field>
          <Field label="Website">
            <input
              disabled={disabled}
              className={inputClass}
              value={form.website}
              onChange={(e) => onChange({ ...form, website: e.target.value })}
              placeholder="https://..."
            />
          </Field>
          <Field label="Phone">
            <input
              disabled={disabled}
              className={inputClass}
              value={form.phone}
              onChange={(e) => onChange({ ...form, phone: e.target.value })}
            />
          </Field>
          <Field label="Email">
            <input
              disabled={disabled}
              type="email"
              className={inputClass}
              value={form.email}
              onChange={(e) => onChange({ ...form, email: e.target.value })}
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        title="Company logo"
        description="Shown beside the company name across FieldOps and on printable invoices. PNG, JPG or WebP up to 2 MB."
      >
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex h-24 w-40 items-center justify-center overflow-hidden border border-border bg-white p-2">
            {logoUrl ? (
              <img src={logoUrl} alt="Company logo preview" className="max-h-full max-w-full object-contain" />
            ) : (
              <div className="text-center text-muted-foreground">
                <ImagePlus className="mx-auto h-7 w-7" />
                <div className="mt-2 text-[10px] font-black uppercase">No logo</div>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              disabled={disabled || logoBusy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onUploadLogo(file);
                event.currentTarget.value = "";
              }}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={disabled || logoBusy}
                onClick={() => fileRef.current?.click()}
                className="inline-flex h-10 items-center gap-2 border border-border px-4 text-xs font-black hover:bg-muted disabled:opacity-50"
              >
                <Upload className="h-4 w-4" />
                {logoBusy ? "Uploading…" : form.logoPath ? "Replace Logo" : "Upload Logo"}
              </button>
              {form.logoPath ? (
                <button
                  type="button"
                  disabled={disabled || logoBusy}
                  onClick={onRemoveLogo}
                  className="inline-flex h-10 items-center gap-2 border border-rose-500/40 px-4 text-xs font-black text-rose-600 hover:bg-rose-500/10 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </button>
              ) : null}
            </div>
            <p className="max-w-lg text-xs text-muted-foreground">
              Uploading changes the preview. Click <strong>Save Company Settings</strong> to publish the logo across the application.
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Business address">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Address line 1">
            <input disabled={disabled} className={inputClass} value={form.address1} onChange={(e) => onChange({ ...form, address1: e.target.value })} />
          </Field>
          <Field label="Address line 2">
            <input disabled={disabled} className={inputClass} value={form.address2} onChange={(e) => onChange({ ...form, address2: e.target.value })} />
          </Field>
          <Field label="City">
            <input disabled={disabled} className={inputClass} value={form.city} onChange={(e) => onChange({ ...form, city: e.target.value })} />
          </Field>
          <Field label="Province / State">
            <input disabled={disabled} className={inputClass} value={form.provinceState} onChange={(e) => onChange({ ...form, provinceState: e.target.value })} />
          </Field>
          <Field label="Postal / ZIP code">
            <input disabled={disabled} className={inputClass} value={form.postalCode} onChange={(e) => onChange({ ...form, postalCode: e.target.value })} />
          </Field>
          <Field label="Country">
            <input disabled={disabled} className={inputClass} value={form.country} onChange={(e) => onChange({ ...form, country: e.target.value })} />
          </Field>
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <button
          disabled={disabled || saving || logoBusy}
          onClick={onSave}
          className="h-11 bg-primary px-5 text-sm font-black text-primary-foreground disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Company Settings"}
        </button>
      </div>
    </div>
  );
}
