"use client";
import { Building2, Clock3, CreditCard, History, Monitor, Package, ShieldCheck } from "lucide-react";
import type { SettingsSection } from "../types";
const tabs: Array<{id:SettingsSection;label:string;icon:any}> = [
  {id:"company",label:"Company",icon:Building2},
  {id:"operations",label:"Operations",icon:Clock3},
  {id:"billing",label:"Billing",icon:CreditCard},
  {id:"inventory",label:"Inventory",icon:Package},
  {id:"access",label:"Users & Access",icon:ShieldCheck},
  {id:"appearance",label:"Appearance & System",icon:Monitor},
  {id:"audit",label:"Audit",icon:History},
];
export function SettingsTabs({ value, onChange }: { value: SettingsSection; onChange: (value:SettingsSection)=>void }) {
  return <div className="flex overflow-x-auto border-b border-border bg-card">{tabs.map((tab)=>{const Icon=tab.icon; const active=value===tab.id; return <button key={tab.id} type="button" onClick={()=>onChange(tab.id)} className={`flex min-w-max items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold ${active?"border-primary text-primary":"border-transparent text-muted-foreground hover:text-foreground"}`}><Icon className="h-4 w-4"/>{tab.label}</button>;})}</div>;
}
