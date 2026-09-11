"use client";

import Link from "next/link";
import {
  BarChart3,
  Bell,
  Boxes,
  Building2,
  ClipboardList,
  LayoutDashboard,
  Package,
  ReceiptText,
  Search,
  SettingsIcon,
  Truck,
  Users,
} from "lucide-react";
import { FieldOpsThemeToggle } from "@/components/fieldops-theme-toggle";
import { CompanyBrand } from "@/components/company-brand";

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Dispatch", icon: Truck, href: "/dispatch" },
  { label: "Work Orders", icon: ClipboardList, href: "/work-orders" },
  { label: "Customers", icon: Building2, href: "/customers" },
  { label: "Field Team", icon: Users, href: "/field-team" },
  { label: "Assets", icon: Boxes, href: "/assets" },
  { label: "Inventory", icon: Package, href: "/inventory" },
  { label: "Billing", icon: ReceiptText, href: "/billing" },
  { label: "Reports", icon: BarChart3, href: "/reports", active: true },
  { label: "Settings", icon: SettingsIcon, href: "/settings" },
];

export default function ReportsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen grid-cols-[236px_1fr]">
        <aside className="border-r border-border bg-card">
          <CompanyBrand className="border-b border-border px-5 py-4" nameClassName="text-lg font-black" compact />
          <nav className="space-y-1 p-3">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium ${
                    item.active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <section className="min-w-0">
          <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
            <div className="flex h-10 w-[420px] items-center gap-2 border border-border px-3 text-sm text-muted-foreground">
              <Search className="h-4 w-4" />
              Search work orders, customers, technicians...
            </div>
            <div className="flex items-center gap-2">
              <FieldOpsThemeToggle />
              <button className="flex h-10 w-10 items-center justify-center border border-border" aria-label="Notifications">
                <Bell className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="p-6">
            <div className="text-sm font-bold text-primary">Reports</div>
            <h1 className="mt-1 text-3xl font-black">Reports</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This page now has its own route folder and is ready for page-by-page development.
            </p>
            <div className="mt-6 border border-border bg-card p-6">
              <div className="text-xs font-black uppercase tracking-wider text-muted-foreground">Page ownership</div>
              <div className="mt-2 text-sm">All Reports page-specific code starts in <code>app/reports/</code>.</div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
