"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BarChart3, Bell, Boxes, Building2, ClipboardList, LayoutDashboard, Package, ReceiptText, Search, Settings as SettingsIcon, Truck, Users } from "lucide-react";
import { FieldOpsThemeToggle } from "@/components/fieldops-theme-toggle";
import { createClient } from "@/lib/supabase/client";
import type { AccessUser, DbProfile, DbRole, DbSettings, DbSettingsAudit, SettingsForm, SettingsSection } from "./types";
import { emptySettingsForm } from "./constants";
import { cleanNullable, settingsToForm } from "./utils";
import { ActionNotice, type ActionNoticeState } from "./components/action-notice";
import { SettingsTabs } from "./components/settings-tabs";
import { CompanyPanel } from "./components/company-panel";
import { OperationsPanel } from "./components/operations-panel";
import { BillingPanel } from "./components/billing-panel";
import { InventoryPanel } from "./components/inventory-panel";
import { AccessPanel } from "./components/access-panel";
import { AppearancePanel } from "./components/appearance-panel";
import { AuditPanel } from "./components/audit-panel";
import { RoleEditorModal } from "./components/modals/role-editor-modal";

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Dispatch", icon: Truck, href: "/dispatch" },
  { label: "Work Orders", icon: ClipboardList, href: "/work-orders" },
  { label: "Customers", icon: Building2, href: "/customers" },
  { label: "Field Team", icon: Users, href: "/field-team" },
  { label: "Assets", icon: Boxes, href: "/assets" },
  { label: "Inventory", icon: Package, href: "/inventory" },
  { label: "Billing", icon: ReceiptText, href: "/billing" },
  { label: "Reports", icon: BarChart3, href: "/reports" },
  { label: "Settings", icon: SettingsIcon, href: "/settings", active: true },
];

const settingsSelect = "id,company_name,legal_name,business_number,phone,email,website,address1,address2,city,province_state,postal_code,country,timezone,currency,locale,date_format,time_format,default_work_order_duration_minutes,default_payment_terms_days,default_tax_rate,invoice_footer,po_approval_required,low_stock_monitoring_enabled,reconciliation_reason_required,certification_alert_days,asset_warranty_alert_days,unassigned_work_order_alert_enabled,overdue_invoice_alert_enabled,updated_by,created_at,updated_at";

export default function SettingsPage() {
  const supabase = useMemo(()=>createClient(),[]);
  const [settings,setSettings]=useState<DbSettings|null>(null);
  const [form,setForm]=useState<SettingsForm>(emptySettingsForm);
  const [profiles,setProfiles]=useState<DbProfile[]>([]);
  const [roles,setRoles]=useState<DbRole[]>([]);
  const [audit,setAudit]=useState<DbSettingsAudit[]>([]);
  const [currentUserId,setCurrentUserId]=useState<string|null>(null);
  const [section,setSection]=useState<SettingsSection>("company");
  const [loading,setLoading]=useState(true);
  const [authRequired,setAuthRequired]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [saving,setSaving]=useState(false);
  const [notice,setNotice]=useState<ActionNoticeState>(null);
  const [roleUser,setRoleUser]=useState<AccessUser|null>(null);
  const [selectedRoles,setSelectedRoles]=useState<string[]>([]);
  const [roleError,setRoleError]=useState<string|null>(null);
  const [savingRoles,setSavingRoles]=useState(false);

  const currentRoles=useMemo(()=>roles.filter(r=>r.user_id===currentUserId).map(r=>r.role),[roles,currentUserId]);
  const isAdmin=currentRoles.includes("admin");
  const canManageSettings=isAdmin||currentRoles.includes("manager");
  const accessUsers=useMemo<AccessUser[]>(()=>profiles.map(profile=>({...profile,roles:roles.filter(r=>r.user_id===profile.id).map(r=>r.role).sort()})).sort((a,b)=>(a.full_name||a.email||"").localeCompare(b.full_name||b.email||"")),[profiles,roles]);
  const currentProfile=profiles.find(p=>p.id===currentUserId)||null;
  const currentUserName=currentProfile?.full_name?.trim()||currentProfile?.email||"Current user";

  function showNotice(type:"info"|"success"|"error", message:string){ setNotice({type,message}); window.setTimeout(()=>setNotice(current=>current?.message===message?null:current),7000); }

  const loadData=useCallback(async()=>{
    setError(null);
    const {data:authData,error:authError}=await supabase.auth.getUser();
    if(authError||!authData.user){setAuthRequired(true);setLoading(false);return;}
    setAuthRequired(false); setCurrentUserId(authData.user.id); setLoading(true);
    const [settingsResult,profilesResult,rolesResult,auditResult]=await Promise.all([
      supabase.from("fieldops_settings").select(settingsSelect).eq("id",1).maybeSingle(),
      supabase.from("profiles").select("id,full_name,email,phone,active,created_at,updated_at").order("full_name"),
      supabase.from("user_roles").select("user_id,role,created_at"),
      supabase.from("fieldops_settings_audit").select("id,event_type,target_user_id,details,created_by,created_at").order("created_at",{ascending:false}).limit(100),
    ]);
    const firstError=settingsResult.error||profilesResult.error||rolesResult.error||auditResult.error;
    if(firstError){setError(firstError.message);setLoading(false);return;}
    const nextSettings=(settingsResult.data??null) as DbSettings|null;
    setSettings(nextSettings); setForm(nextSettings?settingsToForm(nextSettings):emptySettingsForm);
    setProfiles((profilesResult.data??[]) as DbProfile[]); setRoles((rolesResult.data??[]) as DbRole[]); setAudit((auditResult.data??[]) as DbSettingsAudit[]); setLoading(false);
  },[supabase]);

  useEffect(()=>{void loadData();},[loadData]);
  useEffect(()=>{if(authRequired)return; const channel=supabase.channel("fieldops-settings-live").on("postgres_changes",{event:"*",schema:"public",table:"fieldops_settings"},()=>void loadData()).on("postgres_changes",{event:"*",schema:"public",table:"fieldops_settings_audit"},()=>void loadData()).on("postgres_changes",{event:"*",schema:"public",table:"profiles"},()=>void loadData()).on("postgres_changes",{event:"*",schema:"public",table:"user_roles"},()=>void loadData()).subscribe(); return()=>{void supabase.removeChannel(channel);};},[supabase,loadData,authRequired]);

  async function saveSettings(){
    if(!canManageSettings){showNotice("error","Only an Admin or Manager can change system settings.");return;}
    const duration=Number(form.defaultWorkOrderDurationMinutes), terms=Number(form.defaultPaymentTermsDays), tax=Number(form.defaultTaxRatePercent), certDays=Number(form.certificationAlertDays), warrantyDays=Number(form.assetWarrantyAlertDays);
    if(!form.companyName.trim()){showNotice("error","Company display name is required.");return;}
    if(!Number.isFinite(duration)||duration<15||duration>1440){showNotice("error","Default work-order duration must be between 15 and 1440 minutes.");return;}
    if(!Number.isInteger(terms)||terms<0||terms>365){showNotice("error","Default payment terms must be 0 to 365 days.");return;}
    if(!Number.isFinite(tax)||tax<0||tax>100){showNotice("error","Default tax rate must be between 0 and 100%.");return;}
    if(!Number.isInteger(certDays)||certDays<0||certDays>3650||!Number.isInteger(warrantyDays)||warrantyDays<0||warrantyDays>3650){showNotice("error","Warning windows must be whole numbers between 0 and 3650 days.");return;}
    setSaving(true); showNotice("info","Saving FieldOps settings…");
    const payload={company_name:form.companyName.trim(),legal_name:cleanNullable(form.legalName),business_number:cleanNullable(form.businessNumber),phone:cleanNullable(form.phone),email:cleanNullable(form.email),website:cleanNullable(form.website),address1:cleanNullable(form.address1),address2:cleanNullable(form.address2),city:cleanNullable(form.city),province_state:cleanNullable(form.provinceState),postal_code:cleanNullable(form.postalCode),country:form.country.trim()||"Canada",timezone:form.timezone,currency:form.currency.toUpperCase(),locale:form.locale.trim()||"en-CA",date_format:form.dateFormat,time_format:form.timeFormat,default_work_order_duration_minutes:Math.round(duration),default_payment_terms_days:terms,default_tax_rate:tax/100,invoice_footer:cleanNullable(form.invoiceFooter),po_approval_required:form.poApprovalRequired,low_stock_monitoring_enabled:form.lowStockMonitoringEnabled,reconciliation_reason_required:form.reconciliationReasonRequired,certification_alert_days:certDays,asset_warranty_alert_days:warrantyDays,unassigned_work_order_alert_enabled:form.unassignedWorkOrderAlertEnabled,overdue_invoice_alert_enabled:form.overdueInvoiceAlertEnabled,updated_by:currentUserId};
    const {error:updateError}=await supabase.from("fieldops_settings").update(payload).eq("id",1);
    setSaving(false); if(updateError){showNotice("error",updateError.message);return;} await loadData(); showNotice("success","FieldOps settings saved.");
  }

  function openRoleEditor(user:AccessUser){setRoleUser(user);setSelectedRoles([...user.roles]);setRoleError(null);}
  function toggleRole(role:string){setSelectedRoles(current=>current.includes(role)?current.filter(v=>v!==role):[...current,role]);}
  async function saveRoles(){if(!roleUser)return; if(selectedRoles.length===0){setRoleError("An active user must have at least one role.");return;} setSavingRoles(true);setRoleError(null); const {error:rpcError}=await supabase.rpc("fieldops_set_user_roles",{p_user_id:roleUser.id,p_roles:selectedRoles}); setSavingRoles(false); if(rpcError){setRoleError(rpcError.message);return;} setRoleUser(null); await loadData(); showNotice("success","User roles updated.");}
  async function toggleUserActive(user:AccessUser){if(!isAdmin)return; const next=!user.active; if(!window.confirm(`${next?"Reactivate":"Deactivate"} ${user.full_name?.trim()||user.email||"this user"}?`))return; const {error:rpcError}=await supabase.rpc("fieldops_set_user_active",{p_user_id:user.id,p_active:next}); if(rpcError){showNotice("error",rpcError.message);return;} await loadData(); showNotice("success",`User ${next?"reactivated":"deactivated"}.`);}

  if(authRequired)return <main className="min-h-screen bg-background p-8 text-foreground"><div className="mx-auto max-w-xl border border-border bg-card p-6"><h1 className="text-xl font-black">Sign in required</h1><p className="mt-2 text-sm text-muted-foreground">Sign in to FieldOps to open Settings.</p></div></main>;

  return <main className="min-h-screen bg-background text-foreground"><ActionNotice notice={notice} onClose={()=>setNotice(null)}/><div className="grid min-h-screen grid-cols-[236px_1fr]"><aside className="border-r border-border bg-card"><div className="border-b border-border px-5 py-5"><div className="text-lg font-black">FieldOps</div><div className="text-xs text-muted-foreground">Service Operations</div></div><nav className="space-y-1 p-3">{navigation.map(item=>{const Icon=item.icon;return <Link key={item.label} href={item.href} className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium ${item.active?"bg-primary text-primary-foreground":"text-muted-foreground hover:bg-muted hover:text-foreground"}`}><Icon className="h-4 w-4"/>{item.label}</Link>;})}</nav></aside><section className="min-w-0"><header className="flex h-16 items-center justify-between border-b border-border bg-card px-6"><div className="flex h-10 w-[420px] items-center gap-2 border border-border px-3 text-sm text-muted-foreground"><Search className="h-4 w-4"/>Search settings, users, roles...</div><div className="flex items-center gap-2"><FieldOpsThemeToggle/><button className="flex h-10 w-10 items-center justify-center border border-border" aria-label="Notifications"><Bell className="h-4 w-4"/></button></div></header><div className="p-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><div className="text-sm font-bold text-primary">Administration</div><h1 className="mt-1 text-3xl font-black">Settings</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Central business configuration, operational defaults, user access, appearance and settings audit.</p></div><div className="text-right"><div className="text-xs font-black uppercase text-muted-foreground">Your access</div><div className="mt-1 text-sm font-black">{currentRoles.length?currentRoles.map(r=>r.charAt(0).toUpperCase()+r.slice(1)).join(" · "):"No role"}</div></div></div>{error&&<div className="mt-5 border border-rose-500/40 bg-rose-500/10 p-4 text-sm font-semibold text-rose-700 dark:text-rose-200">{error}</div>}<div className="mt-6 overflow-hidden border border-border"><SettingsTabs value={section} onChange={setSection}/><div className="bg-background p-5">{loading?<div className="p-8 text-center text-sm text-muted-foreground">Loading settings…</div>:section==="company"?<CompanyPanel form={form} disabled={!canManageSettings} saving={saving} onChange={setForm} onSave={()=>void saveSettings()}/>:section==="operations"?<OperationsPanel form={form} disabled={!canManageSettings} saving={saving} onChange={setForm} onSave={()=>void saveSettings()}/>:section==="billing"?<BillingPanel form={form} disabled={!canManageSettings} saving={saving} onChange={setForm} onSave={()=>void saveSettings()}/>:section==="inventory"?<InventoryPanel form={form} disabled={!canManageSettings} saving={saving} onChange={setForm} onSave={()=>void saveSettings()}/>:section==="access"?<AccessPanel users={accessUsers} currentUserId={currentUserId} isAdmin={isAdmin} onManage={openRoleEditor} onToggleActive={user=>void toggleUserActive(user)}/>:section==="appearance"?<AppearancePanel settings={settings} currentUserName={currentUserName}/>:<AuditPanel events={audit} profiles={profiles}/>}</div></div>{!canManageSettings&&section!=="appearance"&&section!=="access"&&section!=="audit"&&<div className="mt-3 text-xs text-muted-foreground">You have read-only access to these settings. Admin or Manager is required to save changes.</div>}</div></section></div><RoleEditorModal user={roleUser} selected={selectedRoles} saving={savingRoles} error={roleError} onToggle={toggleRole} onSave={()=>void saveRoles()} onClose={()=>setRoleUser(null)}/></main>;
}
