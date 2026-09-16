"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Boxes,
  Building2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileText,
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

const mainItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Dispatch", icon: Truck, href: "/dispatch" },
  { label: "Work Orders", icon: ClipboardList, href: "/work-orders" },
  { label: "Customers", icon: Building2, href: "/customers" },
  { label: "Field Team", icon: Users, href: "/field-team" },
  { label: "Assets", icon: Boxes, href: "/assets" },
  { label: "Inventory", icon: Package, href: "/inventory" },
];

const accountItems = [
  { label: "Billing", icon: ReceiptText, href: "/billing", section: null },
  { label: "AP", icon: WalletCards, href: "/accounts#payable", section: "payable" as const },
  { label: "AR", icon: FileText, href: "/accounts#receivable", section: "receivable" as const },
  { label: "Reports", icon: FileText, href: "/reports", section: null },
];

export function FieldOpsSidebar({ fixed = false }: { fixed?: boolean }) {
  const pathname = usePathname();

  const accountsActive =
    pathname === "/billing" ||
    pathname === "/reports" ||
    pathname.startsWith("/accounts");

  const [accountsOpen, setAccountsOpen] = useState(false);
  const [hash, setHash] = useState("");

  useEffect(() => {
    const syncHash = () => {
      setHash(window.location.hash);
    };

    syncHash();

    window.addEventListener("hashchange", syncHash);

    return () => {
      window.removeEventListener("hashchange", syncHash);
    };
  }, [pathname]);

  useEffect(() => {
    if (accountsActive) {
      setAccountsOpen(true);
    }
  }, [accountsActive]);

  function mainActive(href: string) {
    if (href === "/dashboard") {
      return pathname === href;
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function accountActive(href: string) {
    if (href === "/billing") {
      return pathname === "/billing";
    }

    if (href.includes("#")) {
      const [path, anchor] = href.split("#");

      return pathname === path && hash === `#${anchor}`;
    }

    return pathname === href;
  }

  function openAccountSection(section: "payable" | "receivable" | "reports") {
    const nextHash = `#${section}`;

    if (pathname === "/accounts") {
      window.history.pushState(null, "", `/accounts${nextHash}`);
      setHash(nextHash);
      window.dispatchEvent(
        new CustomEvent("fieldops:accounts-section", { detail: section })
      );
      return;
    }

    window.location.assign(`/accounts${nextHash}`);
  }

  return (
    <aside
      className={
        fixed
          ? "fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-sidebar xl:flex"
          : "border-r border-border bg-card"
      }
    >
      <CompanyBrand
        className={fixed ? "h-[72px] border-b border-border px-4" : "border-b border-border px-5 py-4"}
        nameClassName="text-lg font-black"
        compact
      />

      <nav className="space-y-1 p-3">
        {mainItems.map((item) => {
          const Icon = item.icon;
          const active = mainActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setAccountsOpen((open) => !open)}
            aria-expanded={accountsOpen}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
              accountsActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Landmark className="h-4 w-4" />

            <span className="flex-1">Accounts</span>

            {accountsOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>

          {accountsOpen ? (
            <div className="ml-5 space-y-1 border-l border-border/70 pl-3">
              {accountItems.map((item) => {
                const Icon = item.icon;
                const active = accountActive(item.href);
                const className = `flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium transition ${
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`;

                if (item.section) {
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => openAccountSection(item.section)}
                      className={className}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                }

                return (
                  <Link key={item.label} href={item.href} className={className}>
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>

        <Link
          href="/settings"
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
            pathname === "/settings"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </Link>
      </nav>
    </aside>
  );
}