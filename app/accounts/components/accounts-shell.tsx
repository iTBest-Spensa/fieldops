"use client";

import Link from "next/link";
import {
  BarChart3,
  Boxes,
  Building2,
  ClipboardList,
  Landmark,
  LayoutDashboard,
  Package,
  ReceiptText,
  Settings,
  Truck,
  Users,
  WalletCards,
} from "lucide-react";
import { CompanyBrand } from "@/components/company-brand";
import { FieldOpsThemeToggle } from "@/components/fieldops-theme-toggle";

export type AccountsSection = "billing" | "payable" | "receivable" | "reports";

const mainNavigation = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Dispatch", icon: Truck, href: "/dispatch" },
  { label: "Work Orders", icon: ClipboardList, href: "/work-orders" },
  { label: "Customers", icon: Building2, href: "/customers" },
  { label: "Field Team", icon: Users, href: "/field-team" },
  { label: "Assets", icon: Boxes, href: "/assets" },
  { label: "Inventory", icon: Package, href: "/inventory" },
  { label: "Accounts", icon: Landmark, href: "/accounts/billing", active: true },
  { label: "Settings", icon: Settings, href: "/settings" },
];

const accountSections = [
  { key: "billing" as const, label: "Billing", description: "Invoices, payments and adjustments", href: "/accounts/billing", icon: ReceiptText },
  { key: "payable" as const, label: "Accounts Payable", description: "Vendor bills and money we owe", href: "/accounts/payable", icon: WalletCards },
  { key: "receivable" as const, label: "Accounts Receivable", description: "Customer balances and aging", href: "/accounts/receivable", icon: Building2 },
  { key: "reports" as const, label: "Reports", description: "Financial statements and aging reports", href: "/accounts/reports", icon: BarChart3 },
];

export function AccountsSectionTabs({ active }: { active: AccountsSection }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {accountSections.map((item) => {
        const Icon = item.icon;
        const selected = item.key === active;
        return (
          <Link
            key={item.key}
            href={item.href}
            className={`rounded-2xl border p-4 transition ${selected ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-card hover:border-primary/50 hover:bg-muted/50"}`}
          >
            <div className="flex items-center gap-3">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${selected ? "bg-primary-foreground/15" : "bg-primary/10 text-primary"}`}>
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="font-black">{item.label}</div>
                <div className={`mt-0.5 text-[11px] ${selected ? "text-primary-foreground/75" : "text-muted-foreground"}`}>{item.description}</div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export function AccountsShell({
  active,
  title,
  description,
  children,
  actions,
}: {
  active: AccountsSection;
  title: string;
  description: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-card lg:block">
        <CompanyBrand
          className="border-b border-border px-5 py-4"
          subtitle="Service Operations & Accounts"
          nameClassName="text-xl font-black tracking-tight"
          subtitleClassName="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-primary"
          compact
        />
        <nav className="space-y-1 p-3">
          {mainNavigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${item.active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="lg:pl-64">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border bg-background/95 px-4 py-4 backdrop-blur md:px-6">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Accounts</div>
            <h1 className="text-2xl font-black">{title}</h1>
            <p className="mt-1 max-w-3xl text-xs text-muted-foreground">{description}</p>
          </div>
          <div className="flex items-center gap-2">
            {actions}
            <FieldOpsThemeToggle />
          </div>
        </header>

        <div className="space-y-6 p-4 md:p-6">
          <AccountsSectionTabs active={active} />
          {children}
        </div>
      </main>
    </div>
  );
}
