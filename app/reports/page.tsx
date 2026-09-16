"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  CircleDollarSign,
  FileBarChart2,
  Landmark,
  ReceiptText,
  RefreshCw,
  Search,
  TrendingUp,
  WalletCards,
  X,
} from "lucide-react";
import { FieldOpsSidebar } from "@/components/fieldops-sidebar";
import { FieldOpsThemeToggle } from "@/components/fieldops-theme-toggle";
import { createClient } from "@/lib/supabase/client";

type ReportKey =
  | "profit-loss"
  | "balance-sheet"
  | "trial-balance"
  | "general-ledger"
  | "journal-entries"
  | "cash-flow"
  | "ar-aging"
  | "customer-balances"
  | "payments-received"
  | "outstanding-invoices"
  | "ap-aging"
  | "vendor-balances"
  | "bills-due"
  | "vendor-payments"
  | "revenue-customer"
  | "revenue-technician"
  | "revenue-service"
  | "revenue-location"
  | "revenue-month"
  | "sales-tax-summary"
  | "tax-collected"
  | "tax-payable"
  | "job-profitability"
  | "technician-profitability"
  | "labor-cost"
  | "material-cost"
  | "gross-margin-job";

type SummaryDetailKey =
  | "invoiced-revenue"
  | "customer-payments"
  | "open-ar"
  | "open-ap";

type AccountRow = {
  id: string;
  code: string;
  name: string;
  account_type: string;
  normal_balance: string;
  active: boolean;
};

type JournalEntryRow = {
  id: string;
  entry_date: string;
  description: string;
  source_type: string;
  source_id: string | null;
  status: string;
  created_at: string;
};

type JournalLineRow = {
  id: string;
  journal_entry_id: string;
  account_id: string;
  description: string | null;
  debit: number | string | null;
  credit: number | string | null;
  created_at: string;
};

type InvoiceRow = {
  id: string;
  invoice_number: string;
  customer_id: string;
  site_id: string | null;
  work_order_id: string | null;
  status: string;
  issued_date: string | null;
  due_date: string | null;
  subtotal: number | string | null;
  tax_amount: number | string | null;
  total: number | string | null;
  amount_paid: number | string | null;
  balance_due: number | string | null;
  customer_name_snapshot: string | null;
  site_address_snapshot: string | null;
};

type PaymentRow = {
  id: string;
  invoice_id: string;
  amount: number | string | null;
  payment_method: string;
  status: string;
  reference: string | null;
  received_at: string;
};

type VendorBillRow = {
  id: string;
  bill_number: string;
  supplier_id: string;
  purchase_order_id: string | null;
  bill_date: string;
  due_date: string | null;
  status: string;
  subtotal: number | string | null;
  tax_amount: number | string | null;
  total: number | string | null;
  amount_paid: number | string | null;
  balance_due: number | string | null;
};

type VendorPaymentRow = {
  id: string;
  vendor_bill_id: string;
  amount: number | string | null;
  payment_method: string;
  reference: string | null;
  paid_at: string;
  status: string;
};

type CustomerRow = { id: string; name: string };
type SiteRow = { id: string; customer_id: string; name: string; city: string | null; province_state: string | null };
type SupplierRow = { id: string; name: string };
type ProfileRow = { id: string; full_name: string | null; email: string | null };

type WorkOrderRow = {
  id: string;
  work_order_number: string;
  customer_id: string;
  site_id: string | null;
  title: string;
  job_type: string | null;
  status: string;
};

type TimeEntryRow = {
  id: string;
  work_order_id: string;
  technician_id: string;
  duration_minutes: number | string | null;
  hourly_rate: number | string | null;
  pay_rate: number | string | null;
  billing_rate: number | string | null;
  billable: boolean;
  activity_type: string | null;
  started_at: string;
  ended_at: string | null;
};

type MaterialUsageRow = {
  id: string;
  work_order_id: string;
  inventory_item_id: string | null;
  description: string;
  quantity: number | string | null;
  quantity_returned: number | string | null;
  unit_cost: number | string | null;
  unit_price: number | string | null;
  billable: boolean;
  created_at: string;
};

type ReportData = {
  accounts: AccountRow[];
  journalEntries: JournalEntryRow[];
  journalLines: JournalLineRow[];
  invoices: InvoiceRow[];
  payments: PaymentRow[];
  vendorBills: VendorBillRow[];
  vendorPayments: VendorPaymentRow[];
  customers: CustomerRow[];
  sites: SiteRow[];
  suppliers: SupplierRow[];
  workOrders: WorkOrderRow[];
  profiles: ProfileRow[];
  timeEntries: TimeEntryRow[];
  materialUsage: MaterialUsageRow[];
};

const emptyData: ReportData = {
  accounts: [],
  journalEntries: [],
  journalLines: [],
  invoices: [],
  payments: [],
  vendorBills: [],
  vendorPayments: [],
  customers: [],
  sites: [],
  suppliers: [],
  workOrders: [],
  profiles: [],
  timeEntries: [],
  materialUsage: [],
};

const reportCategories = [
  {
    title: "Financial",
    description: "Core accounting statements and ledger detail.",
    icon: Landmark,
    reports: [
      ["profit-loss", "Profit & Loss", "Revenue, expenses and net income"],
      ["balance-sheet", "Balance Sheet", "Assets, liabilities, equity and earnings"],
      ["trial-balance", "Trial Balance", "Debit and credit balances by account"],
      ["general-ledger", "General Ledger", "Posted line-by-line ledger activity"],
      ["journal-entries", "Journal Entries", "Posted accounting entries and sources"],
      ["cash-flow", "Cash Flow Statement", "Cash inflows, outflows and net movement"],
    ],
  },
  {
    title: "Receivables",
    description: "What customers owe and what has been collected.",
    icon: ReceiptText,
    reports: [
      ["ar-aging", "A/R Aging", "Outstanding balances by aging bucket"],
      ["customer-balances", "Customer Balances", "Open receivables grouped by customer"],
      ["payments-received", "Payments Received", "Posted customer payment history"],
      ["outstanding-invoices", "Outstanding Invoices", "Invoices with remaining balances"],
    ],
  },
  {
    title: "Payables",
    description: "Supplier obligations, bills and outgoing payments.",
    icon: WalletCards,
    reports: [
      ["ap-aging", "A/P Aging", "Outstanding vendor bills by age"],
      ["vendor-balances", "Vendor Balances", "Open balances grouped by supplier"],
      ["bills-due", "Bills Due", "Vendor bills still requiring payment"],
      ["vendor-payments", "Vendor Payments", "Posted supplier payment history"],
    ],
  },
  {
    title: "Revenue",
    description: "See where invoiced revenue is coming from.",
    icon: TrendingUp,
    reports: [
      ["revenue-customer", "Revenue by Customer", "Invoiced revenue grouped by customer"],
      ["revenue-technician", "Revenue by Technician", "Billable labour revenue from technician time"],
      ["revenue-service", "Revenue by Service", "Revenue grouped by work type"],
      ["revenue-location", "Revenue by Location", "Revenue grouped by service location"],
      ["revenue-month", "Revenue by Month", "Monthly invoiced revenue trend"],
    ],
  },
  {
    title: "Tax",
    description: "Sales tax charged, collected and payable.",
    icon: CircleDollarSign,
    reports: [
      ["sales-tax-summary", "Sales Tax Summary", "Tax charged, collected and ledger liability"],
      ["tax-collected", "Tax Collected", "Tax portion associated with customer receipts"],
      ["tax-payable", "Tax Payable", "Current sales-tax liability from the ledger"],
    ],
  },
  {
    title: "Profitability",
    description: "Revenue compared with labor and material cost.",
    icon: BriefcaseBusiness,
    reports: [
      ["job-profitability", "Job Profitability", "Revenue, labor, materials and margin by job"],
      ["technician-profitability", "Technician Profitability", "Allocated revenue versus labor cost"],
      ["labor-cost", "Labor Cost", "Hours and direct labor cost by technician"],
      ["material-cost", "Material Cost", "Material quantities and cost used on work orders"],
      ["gross-margin-job", "Gross Margin by Job", "Gross margin dollars and percentage by work order"],
    ],
  },
] as const;

const moneyFormatter = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function num(value: number | string | null | undefined) {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
}

function money(value: number) {
  return moneyFormatter.format(value);
}

function recognizedRevenue(invoice: InvoiceRow) {
  return Math.max(0, num(invoice.total) - num(invoice.tax_amount));
}

function pct(value: number) {
  return `${value.toFixed(1)}%`;
}

function datePart(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "";
}

function inRange(value: string | null | undefined, fromDate: string, toDate: string) {
  if (!value) return false;
  const day = datePart(value);
  if (fromDate && day < fromDate) return false;
  if (toDate && day > toDate) return false;
  return true;
}

function onOrBefore(value: string | null | undefined, toDate: string) {
  if (!value) return false;
  return !toDate || datePart(value) <= toDate;
}

function daysPastDue(dueDate: string | null, asOfDate: string) {
  if (!dueDate || !asOfDate) return 0;
  const due = Date.parse(`${dueDate}T00:00:00Z`);
  const asOf = Date.parse(`${asOfDate}T00:00:00Z`);
  return Math.max(0, Math.floor((asOf - due) / 86400000));
}

function agingBucket(dueDate: string | null, asOfDate: string) {
  if (!dueDate || !asOfDate || dueDate >= asOfDate) return "Current";
  const days = daysPastDue(dueDate, asOfDate);
  if (days <= 30) return "1-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}

function displayDate(value: string | null | undefined) {
  return value ? datePart(value) : "—";
}

function accountBalance(account: AccountRow, lines: JournalLineRow[]) {
  const debit = lines.reduce((sum, line) => sum + num(line.debit), 0);
  const credit = lines.reduce((sum, line) => sum + num(line.credit), 0);
  return account.normal_balance === "credit" ? credit - debit : debit - credit;
}

function Metric({ label, value, subtext }: { label: string; value: string; subtext?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-black">{value}</div>
      {subtext ? <div className="mt-1 text-xs text-muted-foreground">{subtext}</div> : null}
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  subtext,
  onViewDetails,
}: {
  label: string;
  value: string;
  subtext: string;
  onViewDetails: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-black">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{subtext}</div>
      <div className="mt-4 border-t border-border pt-3">
        <button
          type="button"
          onClick={onViewDetails}
          className="text-xs font-black text-primary hover:underline"
        >
          View details
        </button>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">{text}</div>;
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-xl font-black">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function TableShell({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">{children}</div>;
}

function Th({ children, right = false }: { children: React.ReactNode; right?: boolean }) {
  return <th className={`px-4 py-3 text-xs font-black uppercase tracking-wider text-muted-foreground ${right ? "text-right" : "text-left"}`}>{children}</th>;
}

function Td({ children, right = false, strong = false }: { children: React.ReactNode; right?: boolean; strong?: boolean }) {
  return <td className={`px-4 py-3 ${right ? "text-right" : "text-left"} ${strong ? "font-black" : ""}`}>{children}</td>;
}

export default function ReportsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [data, setData] = useState<ReportData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeReport, setActiveReport] = useState<ReportKey | null>(null);
  const [summaryDetail, setSummaryDetail] = useState<SummaryDetailKey | null>(null);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [todayIso, setTodayIso] = useState("");

  useEffect(() => {
    setTodayIso(new Date().toISOString().slice(0, 10));
  }, []);

  useEffect(() => {
    if (!summaryDetail) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSummaryDetail(null);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [summaryDetail]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [
        accounts,
        journalEntries,
        journalLines,
        invoices,
        payments,
        vendorBills,
        vendorPayments,
        customers,
        sites,
        suppliers,
        workOrders,
        profiles,
        timeEntries,
        materialUsage,
      ] = await Promise.all([
        supabase.from("accounting_accounts").select("id,code,name,account_type,normal_balance,active").order("code"),
        supabase.from("accounting_journal_entries").select("id,entry_date,description,source_type,source_id,status,created_at").order("entry_date", { ascending: false }).limit(5000),
        supabase.from("accounting_journal_lines").select("id,journal_entry_id,account_id,description,debit,credit,created_at").limit(10000),
        supabase.from("invoices").select("id,invoice_number,customer_id,site_id,work_order_id,status,issued_date,due_date,subtotal,tax_amount,total,amount_paid,balance_due,customer_name_snapshot,site_address_snapshot").order("issued_date", { ascending: false }).limit(5000),
        supabase.from("payments").select("id,invoice_id,amount,payment_method,status,reference,received_at").order("received_at", { ascending: false }).limit(5000),
        supabase.from("vendor_bills").select("id,bill_number,supplier_id,purchase_order_id,bill_date,due_date,status,subtotal,tax_amount,total,amount_paid,balance_due").order("bill_date", { ascending: false }).limit(5000),
        supabase.from("vendor_payments").select("id,vendor_bill_id,amount,payment_method,reference,paid_at,status").order("paid_at", { ascending: false }).limit(5000),
        supabase.from("customers").select("id,name").order("name").limit(5000),
        supabase.from("sites").select("id,customer_id,name,city,province_state").order("name").limit(5000),
        supabase.from("inventory_suppliers").select("id,name").order("name").limit(5000),
        supabase.from("work_orders").select("id,work_order_number,customer_id,site_id,title,job_type,status").limit(5000),
        supabase.from("profiles").select("id,full_name,email").limit(5000),
        supabase.from("time_entries").select("id,work_order_id,technician_id,duration_minutes,hourly_rate,pay_rate,billing_rate,billable,activity_type,started_at,ended_at").limit(10000),
        supabase.from("material_usage").select("id,work_order_id,inventory_item_id,description,quantity,quantity_returned,unit_cost,unit_price,billable,created_at").limit(10000),
      ]);

      const results = [accounts, journalEntries, journalLines, invoices, payments, vendorBills, vendorPayments, customers, sites, suppliers, workOrders, profiles, timeEntries, materialUsage];
      const failed = results.find((result) => result.error);
      if (failed?.error) throw failed.error;

      setData({
        accounts: (accounts.data ?? []) as AccountRow[],
        journalEntries: (journalEntries.data ?? []) as JournalEntryRow[],
        journalLines: (journalLines.data ?? []) as JournalLineRow[],
        invoices: (invoices.data ?? []) as InvoiceRow[],
        payments: (payments.data ?? []) as PaymentRow[],
        vendorBills: (vendorBills.data ?? []) as VendorBillRow[],
        vendorPayments: (vendorPayments.data ?? []) as VendorPaymentRow[],
        customers: (customers.data ?? []) as CustomerRow[],
        sites: (sites.data ?? []) as SiteRow[],
        suppliers: (suppliers.data ?? []) as SupplierRow[],
        workOrders: (workOrders.data ?? []) as WorkOrderRow[],
        profiles: (profiles.data ?? []) as ProfileRow[],
        timeEntries: (timeEntries.data ?? []) as TimeEntryRow[],
        materialUsage: (materialUsage.data ?? []) as MaterialUsageRow[],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load report data.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const accountMap = useMemo(() => new Map(data.accounts.map((row) => [row.id, row])), [data.accounts]);
  const entryMap = useMemo(() => new Map(data.journalEntries.map((row) => [row.id, row])), [data.journalEntries]);
  const invoiceMap = useMemo(() => new Map(data.invoices.map((row) => [row.id, row])), [data.invoices]);
  const vendorBillMap = useMemo(() => new Map(data.vendorBills.map((row) => [row.id, row])), [data.vendorBills]);
  const customerMap = useMemo(() => new Map(data.customers.map((row) => [row.id, row])), [data.customers]);
  const siteMap = useMemo(() => new Map(data.sites.map((row) => [row.id, row])), [data.sites]);
  const supplierMap = useMemo(() => new Map(data.suppliers.map((row) => [row.id, row])), [data.suppliers]);
  const workOrderMap = useMemo(() => new Map(data.workOrders.map((row) => [row.id, row])), [data.workOrders]);
  const profileMap = useMemo(() => new Map(data.profiles.map((row) => [row.id, row])), [data.profiles]);

  const postedEntries = useMemo(() => data.journalEntries.filter((entry) => entry.status === "posted"), [data.journalEntries]);
  const postedEntryIds = useMemo(() => new Set(postedEntries.map((entry) => entry.id)), [postedEntries]);

  const periodLedgerLines = useMemo(
    () => data.journalLines.filter((line) => {
      const entry = entryMap.get(line.journal_entry_id);
      return Boolean(entry && entry.status === "posted" && inRange(entry.entry_date, fromDate, toDate));
    }),
    [data.journalLines, entryMap, fromDate, toDate]
  );

  const asOfLedgerLines = useMemo(
    () => data.journalLines.filter((line) => {
      if (!postedEntryIds.has(line.journal_entry_id)) return false;
      return onOrBefore(entryMap.get(line.journal_entry_id)?.entry_date, toDate);
    }),
    [data.journalLines, entryMap, postedEntryIds, toDate]
  );

  const validInvoices = useMemo(
    () => data.invoices.filter((invoice) => ["approved", "sent", "partial", "paid", "overdue"].includes(invoice.status.toLowerCase())),
    [data.invoices]
  );

  const periodInvoices = useMemo(
    () => validInvoices.filter((invoice) => inRange(invoice.issued_date, fromDate, toDate)),
    [validInvoices, fromDate, toDate]
  );

  const periodPayments = useMemo(
    () => data.payments.filter((payment) => payment.status === "posted" && inRange(payment.received_at, fromDate, toDate)),
    [data.payments, fromDate, toDate]
  );

  const periodVendorBills = useMemo(
    () => data.vendorBills.filter((bill) => ["posted", "partial", "paid"].includes(bill.status.toLowerCase()) && inRange(bill.bill_date, fromDate, toDate)),
    [data.vendorBills, fromDate, toDate]
  );

  const periodVendorPayments = useMemo(
    () => data.vendorPayments.filter((payment) => payment.status === "posted" && inRange(payment.paid_at, fromDate, toDate)),
    [data.vendorPayments, fromDate, toDate]
  );

  const asOfDate = todayIso;

  const openInvoices = useMemo(
    () => validInvoices.filter((invoice) => num(invoice.balance_due) > 0.004),
    [validInvoices]
  );

  const openVendorBills = useMemo(
    () => data.vendorBills.filter((bill) => ["posted", "partial", "paid"].includes(bill.status.toLowerCase()) && num(bill.balance_due) > 0.004),
    [data.vendorBills]
  );

  const periodTimeEntries = useMemo(
    () => data.timeEntries.filter((entry) => inRange(entry.started_at, fromDate, toDate)),
    [data.timeEntries, fromDate, toDate]
  );

  const periodMaterials = useMemo(
    () => data.materialUsage.filter((row) => inRange(row.created_at, fromDate, toDate)),
    [data.materialUsage, fromDate, toDate]
  );

  const periodRevenue = useMemo(() => periodInvoices.reduce((sum, invoice) => sum + recognizedRevenue(invoice), 0), [periodInvoices]);
  const periodTax = useMemo(() => periodInvoices.reduce((sum, invoice) => sum + num(invoice.tax_amount), 0), [periodInvoices]);
  const periodCustomerPayments = useMemo(() => periodPayments.reduce((sum, payment) => sum + num(payment.amount), 0), [periodPayments]);

  const pnlRows = useMemo(() => {
    return data.accounts
      .filter((account) => account.account_type === "revenue" || account.account_type === "expense")
      .map((account) => {
        const lines = periodLedgerLines.filter((line) => line.account_id === account.id);
        const debit = lines.reduce((sum, line) => sum + num(line.debit), 0);
        const credit = lines.reduce((sum, line) => sum + num(line.credit), 0);
        const value = account.account_type === "revenue" ? credit - debit : debit - credit;
        return { account, value };
      });
  }, [data.accounts, periodLedgerLines]);

  const pnlRevenue = useMemo(() => pnlRows.filter((row) => row.account.account_type === "revenue").reduce((sum, row) => sum + row.value, 0), [pnlRows]);
  const pnlExpenses = useMemo(() => pnlRows.filter((row) => row.account.account_type === "expense").reduce((sum, row) => sum + row.value, 0), [pnlRows]);
  const netIncome = pnlRevenue - pnlExpenses;

  const asOfBalances = useMemo(
    () => data.accounts.map((account) => ({ account, balance: accountBalance(account, asOfLedgerLines.filter((line) => line.account_id === account.id)) })),
    [data.accounts, asOfLedgerLines]
  );

  const totalAssets = useMemo(() => asOfBalances.filter((row) => row.account.account_type === "asset").reduce((sum, row) => sum + row.balance, 0), [asOfBalances]);
  const totalLiabilities = useMemo(() => asOfBalances.filter((row) => row.account.account_type === "liability").reduce((sum, row) => sum + row.balance, 0), [asOfBalances]);
  const totalEquity = useMemo(() => asOfBalances.filter((row) => row.account.account_type === "equity").reduce((sum, row) => sum + row.balance, 0), [asOfBalances]);
  const retainedCurrentEarnings = useMemo(() => {
    const revenue = asOfBalances.filter((row) => row.account.account_type === "revenue").reduce((sum, row) => sum + row.balance, 0);
    const expenses = asOfBalances.filter((row) => row.account.account_type === "expense").reduce((sum, row) => sum + row.balance, 0);
    return revenue - expenses;
  }, [asOfBalances]);

  const trialBalanceRows = useMemo(() => {
    return asOfBalances.map(({ account, balance }) => {
      let debit = 0;
      let credit = 0;
      if (account.normal_balance === "credit") {
        if (balance >= 0) credit = balance;
        else debit = Math.abs(balance);
      } else if (balance >= 0) debit = balance;
      else credit = Math.abs(balance);
      return { account, debit, credit };
    });
  }, [asOfBalances]);

  const trialDebit = useMemo(() => trialBalanceRows.reduce((sum, row) => sum + row.debit, 0), [trialBalanceRows]);
  const trialCredit = useMemo(() => trialBalanceRows.reduce((sum, row) => sum + row.credit, 0), [trialBalanceRows]);

  const ledgerRows = useMemo(() => {
    return periodLedgerLines
      .map((line) => ({ line, entry: entryMap.get(line.journal_entry_id), account: accountMap.get(line.account_id) }))
      .filter((row) => row.entry && row.account)
      .sort((a, b) => (b.entry?.entry_date ?? "").localeCompare(a.entry?.entry_date ?? ""));
  }, [periodLedgerLines, entryMap, accountMap]);

  const journalRows = useMemo(() => {
    return postedEntries
      .filter((entry) => inRange(entry.entry_date, fromDate, toDate))
      .map((entry) => {
        const lines = data.journalLines.filter((line) => line.journal_entry_id === entry.id);
        return {
          entry,
          debit: lines.reduce((sum, line) => sum + num(line.debit), 0),
          credit: lines.reduce((sum, line) => sum + num(line.credit), 0),
          lineCount: lines.length,
        };
      });
  }, [postedEntries, fromDate, toDate, data.journalLines]);

  const cashAccount = useMemo(() => data.accounts.find((account) => account.code === "1000" || account.name.toLowerCase().includes("cash")), [data.accounts]);
  const cashLines = useMemo(() => cashAccount ? ledgerRows.filter((row) => row.line.account_id === cashAccount.id) : [], [ledgerRows, cashAccount]);
  const cashInflows = useMemo(() => cashLines.reduce((sum, row) => sum + num(row.line.debit), 0), [cashLines]);
  const cashOutflows = useMemo(() => cashLines.reduce((sum, row) => sum + num(row.line.credit), 0), [cashLines]);

  const arBuckets = useMemo(() => {
    const result = { Current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
    for (const invoice of openInvoices) result[agingBucket(invoice.due_date, asOfDate)] += num(invoice.balance_due);
    return result;
  }, [openInvoices, asOfDate]);

  const customerBalances = useMemo(() => {
    const rows = new Map<string, { name: string; balance: number; invoices: number }>();
    for (const invoice of openInvoices) {
      const key = invoice.customer_id || invoice.customer_name_snapshot || "unknown";
      const name = invoice.customer_name_snapshot || customerMap.get(invoice.customer_id)?.name || "Customer";
      const current = rows.get(key) ?? { name, balance: 0, invoices: 0 };
      current.balance += num(invoice.balance_due);
      current.invoices += 1;
      rows.set(key, current);
    }
    return Array.from(rows.values()).sort((a, b) => b.balance - a.balance);
  }, [openInvoices, customerMap]);

  const apBuckets = useMemo(() => {
    const result = { Current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
    for (const bill of openVendorBills) result[agingBucket(bill.due_date, asOfDate)] += num(bill.balance_due);
    return result;
  }, [openVendorBills, asOfDate]);

  const vendorBalances = useMemo(() => {
    const rows = new Map<string, { name: string; balance: number; bills: number }>();
    for (const bill of openVendorBills) {
      const name = supplierMap.get(bill.supplier_id)?.name || "Supplier";
      const current = rows.get(bill.supplier_id) ?? { name, balance: 0, bills: 0 };
      current.balance += num(bill.balance_due);
      current.bills += 1;
      rows.set(bill.supplier_id, current);
    }
    return Array.from(rows.values()).sort((a, b) => b.balance - a.balance);
  }, [openVendorBills, supplierMap]);

  const revenueByCustomer = useMemo(() => {
    const rows = new Map<string, { name: string; revenue: number; invoices: number }>();
    for (const invoice of periodInvoices) {
      const key = invoice.customer_id || invoice.customer_name_snapshot || "unknown";
      const name = invoice.customer_name_snapshot || customerMap.get(invoice.customer_id)?.name || "Customer";
      const current = rows.get(key) ?? { name, revenue: 0, invoices: 0 };
      current.revenue += recognizedRevenue(invoice);
      current.invoices += 1;
      rows.set(key, current);
    }
    return Array.from(rows.values()).sort((a, b) => b.revenue - a.revenue);
  }, [periodInvoices, customerMap]);

  const revenueByTechnician = useMemo(() => {
    const rows = new Map<string, { name: string; revenue: number; jobs: Set<string> }>();
    for (const entry of periodTimeEntries) {
      if (!entry.billable) continue;
      const minutes = num(entry.duration_minutes);
      const billingRate = num(entry.billing_rate);
      if (minutes <= 0 || billingRate <= 0) continue;
      const techId = entry.technician_id;
      const name = profileMap.get(techId)?.full_name || profileMap.get(techId)?.email || "Technician";
      const current = rows.get(techId) ?? { name, revenue: 0, jobs: new Set<string>() };
      current.revenue += (minutes / 60) * billingRate;
      if (entry.work_order_id) current.jobs.add(entry.work_order_id);
      rows.set(techId, current);
    }
    return Array.from(rows.entries()).map(([id, row]) => ({ id, name: row.name, revenue: row.revenue, jobs: row.jobs.size })).sort((a, b) => b.revenue - a.revenue);
  }, [periodTimeEntries, profileMap]);

  const revenueByService = useMemo(() => {
    const rows = new Map<string, { name: string; revenue: number; invoices: number }>();
    for (const invoice of periodInvoices) {
      const wo = invoice.work_order_id ? workOrderMap.get(invoice.work_order_id) : undefined;
      const name = wo?.job_type || wo?.title || "Uncategorized";
      const current = rows.get(name) ?? { name, revenue: 0, invoices: 0 };
      current.revenue += recognizedRevenue(invoice);
      current.invoices += 1;
      rows.set(name, current);
    }
    return Array.from(rows.values()).sort((a, b) => b.revenue - a.revenue);
  }, [periodInvoices, workOrderMap]);

  const revenueByLocation = useMemo(() => {
    const rows = new Map<string, { name: string; revenue: number; invoices: number }>();
    for (const invoice of periodInvoices) {
      const wo = invoice.work_order_id ? workOrderMap.get(invoice.work_order_id) : undefined;
      const siteId = invoice.site_id || wo?.site_id || "";
      const site = siteId ? siteMap.get(siteId) : undefined;
      const name = site ? `${site.name}${site.city ? ` · ${site.city}` : ""}` : invoice.site_address_snapshot || "No location";
      const current = rows.get(siteId || name) ?? { name, revenue: 0, invoices: 0 };
      current.revenue += recognizedRevenue(invoice);
      current.invoices += 1;
      rows.set(siteId || name, current);
    }
    return Array.from(rows.values()).sort((a, b) => b.revenue - a.revenue);
  }, [periodInvoices, workOrderMap, siteMap]);

  const revenueByMonth = useMemo(() => {
    const rows = new Map<string, { month: string; revenue: number; invoices: number }>();
    for (const invoice of periodInvoices) {
      const month = invoice.issued_date ? invoice.issued_date.slice(0, 7) : "Undated";
      const current = rows.get(month) ?? { month, revenue: 0, invoices: 0 };
      current.revenue += recognizedRevenue(invoice);
      current.invoices += 1;
      rows.set(month, current);
    }
    return Array.from(rows.values()).sort((a, b) => b.month.localeCompare(a.month));
  }, [periodInvoices]);

  const taxCashCollected = useMemo(() => {
    const paidByInvoice = new Map<string, number>();
    for (const payment of periodPayments) {
      paidByInvoice.set(payment.invoice_id, (paidByInvoice.get(payment.invoice_id) ?? 0) + num(payment.amount));
    }
    let total = 0;
    for (const [invoiceId, paid] of paidByInvoice) {
      const invoice = invoiceMap.get(invoiceId);
      if (!invoice) continue;
      const invoiceTotal = num(invoice.total);
      if (invoiceTotal <= 0) continue;
      total += Math.min(invoiceTotal, paid) * (num(invoice.tax_amount) / invoiceTotal);
    }
    return total;
  }, [periodPayments, invoiceMap]);

  const vendorTaxRecorded = useMemo(() => periodVendorBills.reduce((sum, bill) => sum + num(bill.tax_amount), 0), [periodVendorBills]);

  const taxPayableAccount = useMemo(() => data.accounts.find((account) => account.code === "2100" || account.name.toLowerCase().includes("tax payable")), [data.accounts]);
  const taxPayableBalance = useMemo(() => taxPayableAccount ? accountBalance(taxPayableAccount, asOfLedgerLines.filter((line) => line.account_id === taxPayableAccount.id)) : 0, [taxPayableAccount, asOfLedgerLines]);

  const laborByWorkOrder = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of periodTimeEntries) {
      const rate = num(entry.pay_rate) || num(entry.hourly_rate);
      const cost = (num(entry.duration_minutes) / 60) * rate;
      map.set(entry.work_order_id, (map.get(entry.work_order_id) ?? 0) + cost);
    }
    return map;
  }, [periodTimeEntries]);

  const materialByWorkOrder = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of periodMaterials) {
      const netQty = Math.max(0, num(row.quantity) - num(row.quantity_returned));
      map.set(row.work_order_id, (map.get(row.work_order_id) ?? 0) + netQty * num(row.unit_cost));
    }
    return map;
  }, [periodMaterials]);

  const revenueByWorkOrder = useMemo(() => {
    const map = new Map<string, number>();
    for (const invoice of periodInvoices) {
      if (!invoice.work_order_id) continue;
      map.set(invoice.work_order_id, (map.get(invoice.work_order_id) ?? 0) + recognizedRevenue(invoice));
    }
    return map;
  }, [periodInvoices]);

  const jobProfitability = useMemo(() => {
    const ids = new Set<string>([...revenueByWorkOrder.keys(), ...laborByWorkOrder.keys(), ...materialByWorkOrder.keys()]);
    return Array.from(ids).map((id) => {
      const wo = workOrderMap.get(id);
      const revenue = revenueByWorkOrder.get(id) ?? 0;
      const labor = laborByWorkOrder.get(id) ?? 0;
      const material = materialByWorkOrder.get(id) ?? 0;
      const margin = revenue - labor - material;
      return {
        id,
        number: wo?.work_order_number || id.slice(0, 8),
        title: wo?.title || "Work order",
        revenue,
        labor,
        material,
        margin,
        marginPct: revenue > 0 ? (margin / revenue) * 100 : 0,
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [revenueByWorkOrder, laborByWorkOrder, materialByWorkOrder, workOrderMap]);

  const laborByTechnician = useMemo(() => {
    const rows = new Map<string, { id: string; name: string; minutes: number; billableMinutes: number; cost: number }>();
    for (const entry of periodTimeEntries) {
      const name = profileMap.get(entry.technician_id)?.full_name || profileMap.get(entry.technician_id)?.email || "Technician";
      const current = rows.get(entry.technician_id) ?? { id: entry.technician_id, name, minutes: 0, billableMinutes: 0, cost: 0 };
      const minutes = num(entry.duration_minutes);
      const rate = num(entry.pay_rate) || num(entry.hourly_rate);
      current.minutes += minutes;
      if (entry.billable) current.billableMinutes += minutes;
      current.cost += (minutes / 60) * rate;
      rows.set(entry.technician_id, current);
    }
    return Array.from(rows.values()).sort((a, b) => b.cost - a.cost);
  }, [periodTimeEntries, profileMap]);

  const technicianProfitability = useMemo(() => {
    const revenueMap = new Map(revenueByTechnician.map((row) => [row.id, row]));
    const laborMap = new Map(laborByTechnician.map((row) => [row.id, row]));
    const ids = new Set<string>([...revenueMap.keys(), ...laborMap.keys()]);
    return Array.from(ids).map((id) => {
      const revenueRow = revenueMap.get(id);
      const laborRow = laborMap.get(id);
      const revenue = revenueRow?.revenue ?? 0;
      const labor = laborRow?.cost ?? 0;
      const margin = revenue - labor;
      return {
        id,
        name: revenueRow?.name || laborRow?.name || "Technician",
        revenue,
        labor,
        margin,
        marginPct: revenue > 0 ? (margin / revenue) * 100 : 0,
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [revenueByTechnician, laborByTechnician]);

  const materialCostRows = useMemo(() => {
    const rows = new Map<string, { description: string; quantity: number; cost: number; workOrders: Set<string> }>();
    for (const row of periodMaterials) {
      const key = row.inventory_item_id || row.description;
      const netQty = Math.max(0, num(row.quantity) - num(row.quantity_returned));
      const current = rows.get(key) ?? { description: row.description || "Material", quantity: 0, cost: 0, workOrders: new Set<string>() };
      current.quantity += netQty;
      current.cost += netQty * num(row.unit_cost);
      current.workOrders.add(row.work_order_id);
      rows.set(key, current);
    }
    return Array.from(rows.values()).map((row) => ({ ...row, workOrderCount: row.workOrders.size })).sort((a, b) => b.cost - a.cost);
  }, [periodMaterials]);

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return reportCategories;
    return reportCategories
      .map((category) => ({
        ...category,
        reports: category.reports.filter((report) => `${report[1]} ${report[2]} ${category.title}`.toLowerCase().includes(q)),
      }))
      .filter((category) => category.reports.length > 0);
  }, [search]);

  function reportTitle(key: ReportKey) {
    for (const category of reportCategories) {
      const found = category.reports.find((report) => report[0] === key);
      if (found) return found[1];
    }
    return "Report";
  }

  function reportPeriodDescription(key: ReportKey) {
    if (["ar-aging", "customer-balances", "outstanding-invoices", "ap-aging", "vendor-balances", "bills-due"].includes(key)) {
      return "Current open balances and aging as of today.";
    }
    if (["balance-sheet", "trial-balance", "tax-payable"].includes(key)) {
      return `Ledger balances through ${toDate || "today"}.`;
    }
    return fromDate || toDate
      ? `Reporting period ${fromDate || "beginning"} to ${toDate || "today"}.`
      : "All available FieldOps accounting data.";
  }

  function reportPeriodBadge(key: ReportKey) {
    if (["ar-aging", "customer-balances", "outstanding-invoices", "ap-aging", "vendor-balances", "bills-due"].includes(key)) {
      return "Current";
    }
    if (["balance-sheet", "trial-balance", "tax-payable"].includes(key)) {
      return `Through ${toDate || "today"}`;
    }
    return `${fromDate || "Beginning"} → ${toDate || "Today"}`;
  }

  function renderAgingTable(kind: "ar" | "ap") {
    const buckets = kind === "ar" ? arBuckets : apBuckets;
    const total = Object.values(buckets).reduce((sum, value) => sum + value, 0);
    return (
      <>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {Object.entries(buckets).map(([label, value]) => <Metric key={label} label={label} value={money(value)} />)}
        </div>
        <Metric label={kind === "ar" ? "Total A/R" : "Total A/P"} value={money(total)} />
      </>
    );
  }

  function summaryDetailTitle(key: SummaryDetailKey) {
    switch (key) {
      case "invoiced-revenue":
        return "Invoiced Revenue Details";
      case "customer-payments":
        return "Customer Payment Details";
      case "open-ar":
        return "Open A/R Details";
      case "open-ap":
        return "Open A/P Details";
    }
  }

  function summaryDetailDescription(key: SummaryDetailKey) {
    switch (key) {
      case "invoiced-revenue":
        return fromDate || toDate
          ? `Invoices issued from ${fromDate || "the beginning"} through ${toDate || "today"}.`
          : "All recognized invoices currently available in FieldOps.";
      case "customer-payments":
        return fromDate || toDate
          ? `Posted customer payments received from ${fromDate || "the beginning"} through ${toDate || "today"}.`
          : "All posted customer payments currently available in FieldOps.";
      case "open-ar":
        return "Invoices that still have an outstanding customer balance.";
      case "open-ap":
        return "Vendor bills that still have an outstanding balance.";
    }
  }

  function renderSummaryDetail(key: SummaryDetailKey) {
    switch (key) {
      case "invoiced-revenue":
        return periodInvoices.length ? (
          <TableShell>
            <table className="w-full text-sm">
              <thead className="bg-muted/60">
                <tr>
                  <Th>Issued</Th>
                  <Th>Invoice</Th>
                  <Th>Customer</Th>
                  <Th>Status</Th>
                  <Th right>Revenue</Th>
                  <Th right>Tax</Th>
                  <Th right>Total</Th>
                </tr>
              </thead>
              <tbody>
                {periodInvoices.map((invoice) => (
                  <tr key={invoice.id} className="border-t border-border">
                    <Td>{displayDate(invoice.issued_date)}</Td>
                    <Td strong>{invoice.invoice_number}</Td>
                    <Td>{invoice.customer_name_snapshot || customerMap.get(invoice.customer_id)?.name || "Customer"}</Td>
                    <Td>{invoice.status}</Td>
                    <Td right strong>{money(recognizedRevenue(invoice))}</Td>
                    <Td right>{money(num(invoice.tax_amount))}</Td>
                    <Td right>{money(num(invoice.total))}</Td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-border font-black">
                <tr>
                  <Td> </Td>
                  <Td>Total</Td>
                  <Td> </Td>
                  <Td> </Td>
                  <Td right>{money(periodRevenue)}</Td>
                  <Td right>{money(periodTax)}</Td>
                  <Td right>{money(periodInvoices.reduce((sum, invoice) => sum + num(invoice.total), 0))}</Td>
                </tr>
              </tfoot>
            </table>
          </TableShell>
        ) : (
          <EmptyState text="No invoices were found in the selected period." />
        );

      case "customer-payments":
        return periodPayments.length ? (
          <TableShell>
            <table className="w-full text-sm">
              <thead className="bg-muted/60">
                <tr>
                  <Th>Date</Th>
                  <Th>Customer</Th>
                  <Th>Invoice</Th>
                  <Th>Method</Th>
                  <Th>Reference</Th>
                  <Th right>Amount</Th>
                </tr>
              </thead>
              <tbody>
                {periodPayments.map((payment) => {
                  const invoice = invoiceMap.get(payment.invoice_id);
                  return (
                    <tr key={payment.id} className="border-t border-border">
                      <Td>{displayDate(payment.received_at)}</Td>
                      <Td strong>{invoice?.customer_name_snapshot || (invoice ? customerMap.get(invoice.customer_id)?.name : "") || "Customer"}</Td>
                      <Td>{invoice?.invoice_number || "—"}</Td>
                      <Td>{payment.payment_method}</Td>
                      <Td>{payment.reference || "—"}</Td>
                      <Td right strong>{money(num(payment.amount))}</Td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-border font-black">
                <tr>
                  <Td> </Td>
                  <Td>Total</Td>
                  <Td> </Td>
                  <Td> </Td>
                  <Td> </Td>
                  <Td right>{money(periodCustomerPayments)}</Td>
                </tr>
              </tfoot>
            </table>
          </TableShell>
        ) : (
          <EmptyState text="No posted customer payments were found in the selected period." />
        );

      case "open-ar":
        return openInvoices.length ? (
          <TableShell>
            <table className="w-full text-sm">
              <thead className="bg-muted/60">
                <tr>
                  <Th>Customer</Th>
                  <Th>Invoice</Th>
                  <Th>Issued</Th>
                  <Th>Due</Th>
                  <Th>Status</Th>
                  <Th right>Total</Th>
                  <Th right>Paid</Th>
                  <Th right>Balance</Th>
                </tr>
              </thead>
              <tbody>
                {openInvoices.map((invoice) => (
                  <tr key={invoice.id} className="border-t border-border">
                    <Td strong>{invoice.customer_name_snapshot || customerMap.get(invoice.customer_id)?.name || "Customer"}</Td>
                    <Td>{invoice.invoice_number}</Td>
                    <Td>{displayDate(invoice.issued_date)}</Td>
                    <Td>{displayDate(invoice.due_date)}</Td>
                    <Td>{invoice.status}</Td>
                    <Td right>{money(num(invoice.total))}</Td>
                    <Td right>{money(num(invoice.amount_paid))}</Td>
                    <Td right strong>{money(num(invoice.balance_due))}</Td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-border font-black">
                <tr>
                  <Td> </Td>
                  <Td>Total</Td>
                  <Td> </Td>
                  <Td> </Td>
                  <Td> </Td>
                  <Td> </Td>
                  <Td> </Td>
                  <Td right>{money(openInvoices.reduce((sum, invoice) => sum + num(invoice.balance_due), 0))}</Td>
                </tr>
              </tfoot>
            </table>
          </TableShell>
        ) : (
          <EmptyState text="There are no outstanding customer invoices." />
        );

      case "open-ap":
        return openVendorBills.length ? (
          <TableShell>
            <table className="w-full text-sm">
              <thead className="bg-muted/60">
                <tr>
                  <Th>Supplier</Th>
                  <Th>Bill</Th>
                  <Th>Bill Date</Th>
                  <Th>Due</Th>
                  <Th>Status</Th>
                  <Th right>Total</Th>
                  <Th right>Paid</Th>
                  <Th right>Balance</Th>
                </tr>
              </thead>
              <tbody>
                {openVendorBills.map((bill) => (
                  <tr key={bill.id} className="border-t border-border">
                    <Td strong>{supplierMap.get(bill.supplier_id)?.name || "Supplier"}</Td>
                    <Td>{bill.bill_number}</Td>
                    <Td>{displayDate(bill.bill_date)}</Td>
                    <Td>{displayDate(bill.due_date)}</Td>
                    <Td>{bill.status}</Td>
                    <Td right>{money(num(bill.total))}</Td>
                    <Td right>{money(num(bill.amount_paid))}</Td>
                    <Td right strong>{money(num(bill.balance_due))}</Td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-border font-black">
                <tr>
                  <Td> </Td>
                  <Td>Total</Td>
                  <Td> </Td>
                  <Td> </Td>
                  <Td> </Td>
                  <Td> </Td>
                  <Td> </Td>
                  <Td right>{money(openVendorBills.reduce((sum, bill) => sum + num(bill.balance_due), 0))}</Td>
                </tr>
              </tfoot>
            </table>
          </TableShell>
        ) : (
          <EmptyState text="There are no outstanding vendor bills." />
        );
    }
  }

  function renderReport(key: ReportKey) {
    switch (key) {
      case "profit-loss":
        return (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3"><Metric label="Revenue" value={money(pnlRevenue)} /><Metric label="Expenses" value={money(pnlExpenses)} /><Metric label="Net Income" value={money(netIncome)} /></div>
            <TableShell><table className="w-full text-sm"><thead className="bg-muted/60"><tr><Th>Code</Th><Th>Account</Th><Th>Type</Th><Th right>Amount</Th></tr></thead><tbody>{pnlRows.map(({ account, value }) => <tr key={account.id} className="border-t border-border"><Td>{account.code}</Td><Td strong>{account.name}</Td><Td>{account.account_type}</Td><Td right strong>{money(value)}</Td></tr>)}</tbody></table></TableShell>
          </div>
        );
      case "balance-sheet":
        return (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Metric label="Assets" value={money(totalAssets)} /><Metric label="Liabilities" value={money(totalLiabilities)} /><Metric label="Equity" value={money(totalEquity)} /><Metric label="Current Earnings" value={money(retainedCurrentEarnings)} /></div>
            <TableShell><table className="w-full text-sm"><thead className="bg-muted/60"><tr><Th>Code</Th><Th>Account</Th><Th>Type</Th><Th right>Balance</Th></tr></thead><tbody>{asOfBalances.filter((row) => ["asset", "liability", "equity"].includes(row.account.account_type)).map(({ account, balance }) => <tr key={account.id} className="border-t border-border"><Td>{account.code}</Td><Td strong>{account.name}</Td><Td>{account.account_type}</Td><Td right strong>{money(balance)}</Td></tr>)}</tbody></table></TableShell>
            <div className="rounded-2xl border border-border bg-card p-5 text-sm"><span className="font-black">Balance check:</span> Assets {money(totalAssets)} = Liabilities + Equity + Current earnings {money(totalLiabilities + totalEquity + retainedCurrentEarnings)}</div>
          </div>
        );
      case "trial-balance":
        return (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2"><Metric label="Total Debits" value={money(trialDebit)} /><Metric label="Total Credits" value={money(trialCredit)} /></div>
            <TableShell><table className="w-full text-sm"><thead className="bg-muted/60"><tr><Th>Code</Th><Th>Account</Th><Th>Type</Th><Th right>Debit</Th><Th right>Credit</Th></tr></thead><tbody>{trialBalanceRows.map(({ account, debit, credit }) => <tr key={account.id} className="border-t border-border"><Td>{account.code}</Td><Td strong>{account.name}</Td><Td>{account.account_type}</Td><Td right>{money(debit)}</Td><Td right>{money(credit)}</Td></tr>)}</tbody><tfoot className="border-t-2 border-border font-black"><tr><Td> </Td><Td>Total</Td><Td> </Td><Td right>{money(trialDebit)}</Td><Td right>{money(trialCredit)}</Td></tr></tfoot></table></TableShell>
          </div>
        );
      case "general-ledger":
        return ledgerRows.length ? <TableShell><table className="w-full text-sm"><thead className="bg-muted/60"><tr><Th>Date</Th><Th>Account</Th><Th>Description</Th><Th>Source</Th><Th right>Debit</Th><Th right>Credit</Th></tr></thead><tbody>{ledgerRows.map(({ line, entry, account }) => <tr key={line.id} className="border-t border-border"><Td>{displayDate(entry?.entry_date)}</Td><Td strong>{account?.code} · {account?.name}</Td><Td>{line.description || entry?.description || "—"}</Td><Td>{entry?.source_type || "—"}</Td><Td right>{money(num(line.debit))}</Td><Td right>{money(num(line.credit))}</Td></tr>)}</tbody></table></TableShell> : <EmptyState text="No posted ledger activity in this period." />;
      case "journal-entries":
        return journalRows.length ? <TableShell><table className="w-full text-sm"><thead className="bg-muted/60"><tr><Th>Date</Th><Th>Description</Th><Th>Source</Th><Th>Lines</Th><Th right>Debit</Th><Th right>Credit</Th></tr></thead><tbody>{journalRows.map(({ entry, debit, credit, lineCount }) => <tr key={entry.id} className="border-t border-border"><Td>{displayDate(entry.entry_date)}</Td><Td strong>{entry.description}</Td><Td>{entry.source_type}</Td><Td>{lineCount}</Td><Td right>{money(debit)}</Td><Td right>{money(credit)}</Td></tr>)}</tbody></table></TableShell> : <EmptyState text="No posted journal entries in this period." />;
      case "cash-flow":
        return (
          <div className="space-y-5"><div className="grid gap-4 md:grid-cols-3"><Metric label="Cash Inflows" value={money(cashInflows)} /><Metric label="Cash Outflows" value={money(cashOutflows)} /><Metric label="Net Cash Movement" value={money(cashInflows - cashOutflows)} /></div>{cashLines.length ? <TableShell><table className="w-full text-sm"><thead className="bg-muted/60"><tr><Th>Date</Th><Th>Description</Th><Th>Source</Th><Th right>Inflow</Th><Th right>Outflow</Th></tr></thead><tbody>{cashLines.map(({ line, entry }) => <tr key={line.id} className="border-t border-border"><Td>{displayDate(entry?.entry_date)}</Td><Td strong>{line.description || entry?.description || "Cash activity"}</Td><Td>{entry?.source_type || "—"}</Td><Td right>{money(num(line.debit))}</Td><Td right>{money(num(line.credit))}</Td></tr>)}</tbody></table></TableShell> : <EmptyState text="No cash-ledger movement in this period." />}</div>
        );
      case "ar-aging":
        return <div className="space-y-5">{renderAgingTable("ar")}{openInvoices.length ? <TableShell><table className="w-full text-sm"><thead className="bg-muted/60"><tr><Th>Customer</Th><Th>Invoice</Th><Th>Due</Th><Th>Bucket</Th><Th right>Balance</Th></tr></thead><tbody>{openInvoices.map((invoice) => <tr key={invoice.id} className="border-t border-border"><Td strong>{invoice.customer_name_snapshot || customerMap.get(invoice.customer_id)?.name || "Customer"}</Td><Td>{invoice.invoice_number}</Td><Td>{displayDate(invoice.due_date)}</Td><Td>{agingBucket(invoice.due_date, asOfDate)}</Td><Td right strong>{money(num(invoice.balance_due))}</Td></tr>)}</tbody></table></TableShell> : <EmptyState text="No outstanding receivables." />}</div>;
      case "customer-balances":
        return customerBalances.length ? <TableShell><table className="w-full text-sm"><thead className="bg-muted/60"><tr><Th>Customer</Th><Th>Open Invoices</Th><Th right>Balance</Th></tr></thead><tbody>{customerBalances.map((row) => <tr key={row.name} className="border-t border-border"><Td strong>{row.name}</Td><Td>{row.invoices}</Td><Td right strong>{money(row.balance)}</Td></tr>)}</tbody></table></TableShell> : <EmptyState text="No customer balances are outstanding." />;
      case "payments-received":
        return <div className="space-y-5"><div className="grid gap-4 md:grid-cols-2"><Metric label="Payments Received" value={money(periodCustomerPayments)} /><Metric label="Transactions" value={String(periodPayments.length)} /></div>{periodPayments.length ? <TableShell><table className="w-full text-sm"><thead className="bg-muted/60"><tr><Th>Date</Th><Th>Customer</Th><Th>Invoice</Th><Th>Method</Th><Th>Reference</Th><Th right>Amount</Th></tr></thead><tbody>{periodPayments.map((payment) => { const invoice = invoiceMap.get(payment.invoice_id); return <tr key={payment.id} className="border-t border-border"><Td>{displayDate(payment.received_at)}</Td><Td strong>{invoice?.customer_name_snapshot || (invoice ? customerMap.get(invoice.customer_id)?.name : "") || "Customer"}</Td><Td>{invoice?.invoice_number || "—"}</Td><Td>{payment.payment_method}</Td><Td>{payment.reference || "—"}</Td><Td right strong>{money(num(payment.amount))}</Td></tr>; })}</tbody></table></TableShell> : <EmptyState text="No posted customer payments in this period." />}</div>;
      case "outstanding-invoices":
        return openInvoices.length ? <TableShell><table className="w-full text-sm"><thead className="bg-muted/60"><tr><Th>Customer</Th><Th>Invoice</Th><Th>Issued</Th><Th>Due</Th><Th>Status</Th><Th right>Total</Th><Th right>Paid</Th><Th right>Balance</Th></tr></thead><tbody>{openInvoices.map((invoice) => <tr key={invoice.id} className="border-t border-border"><Td strong>{invoice.customer_name_snapshot || customerMap.get(invoice.customer_id)?.name || "Customer"}</Td><Td>{invoice.invoice_number}</Td><Td>{displayDate(invoice.issued_date)}</Td><Td>{displayDate(invoice.due_date)}</Td><Td>{invoice.status}</Td><Td right>{money(num(invoice.total))}</Td><Td right>{money(num(invoice.amount_paid))}</Td><Td right strong>{money(num(invoice.balance_due))}</Td></tr>)}</tbody></table></TableShell> : <EmptyState text="No outstanding invoices." />;
      case "ap-aging":
        return <div className="space-y-5">{renderAgingTable("ap")}{openVendorBills.length ? <TableShell><table className="w-full text-sm"><thead className="bg-muted/60"><tr><Th>Supplier</Th><Th>Bill</Th><Th>Due</Th><Th>Bucket</Th><Th right>Balance</Th></tr></thead><tbody>{openVendorBills.map((bill) => <tr key={bill.id} className="border-t border-border"><Td strong>{supplierMap.get(bill.supplier_id)?.name || "Supplier"}</Td><Td>{bill.bill_number}</Td><Td>{displayDate(bill.due_date)}</Td><Td>{agingBucket(bill.due_date, asOfDate)}</Td><Td right strong>{money(num(bill.balance_due))}</Td></tr>)}</tbody></table></TableShell> : <EmptyState text="No outstanding payables." />}</div>;
      case "vendor-balances":
        return vendorBalances.length ? <TableShell><table className="w-full text-sm"><thead className="bg-muted/60"><tr><Th>Supplier</Th><Th>Open Bills</Th><Th right>Balance</Th></tr></thead><tbody>{vendorBalances.map((row) => <tr key={row.name} className="border-t border-border"><Td strong>{row.name}</Td><Td>{row.bills}</Td><Td right strong>{money(row.balance)}</Td></tr>)}</tbody></table></TableShell> : <EmptyState text="No vendor balances are outstanding." />;
      case "bills-due":
        return openVendorBills.length ? <TableShell><table className="w-full text-sm"><thead className="bg-muted/60"><tr><Th>Supplier</Th><Th>Bill</Th><Th>Bill Date</Th><Th>Due</Th><Th>Status</Th><Th right>Total</Th><Th right>Paid</Th><Th right>Balance</Th></tr></thead><tbody>{openVendorBills.map((bill) => <tr key={bill.id} className="border-t border-border"><Td strong>{supplierMap.get(bill.supplier_id)?.name || "Supplier"}</Td><Td>{bill.bill_number}</Td><Td>{displayDate(bill.bill_date)}</Td><Td>{displayDate(bill.due_date)}</Td><Td>{bill.status}</Td><Td right>{money(num(bill.total))}</Td><Td right>{money(num(bill.amount_paid))}</Td><Td right strong>{money(num(bill.balance_due))}</Td></tr>)}</tbody></table></TableShell> : <EmptyState text="No vendor bills are due." />;
      case "vendor-payments":
        return periodVendorPayments.length ? <TableShell><table className="w-full text-sm"><thead className="bg-muted/60"><tr><Th>Date</Th><Th>Supplier</Th><Th>Bill</Th><Th>Method</Th><Th>Reference</Th><Th right>Amount</Th></tr></thead><tbody>{periodVendorPayments.map((payment) => { const bill = vendorBillMap.get(payment.vendor_bill_id); return <tr key={payment.id} className="border-t border-border"><Td>{displayDate(payment.paid_at)}</Td><Td strong>{bill ? supplierMap.get(bill.supplier_id)?.name || "Supplier" : "Supplier"}</Td><Td>{bill?.bill_number || "—"}</Td><Td>{payment.payment_method}</Td><Td>{payment.reference || "—"}</Td><Td right strong>{money(num(payment.amount))}</Td></tr>; })}</tbody></table></TableShell> : <EmptyState text="No posted vendor payments in this period." />;
      case "revenue-customer":
        return <div className="space-y-5"><div className="grid gap-4 md:grid-cols-2"><Metric label="Revenue" value={money(periodRevenue)} /><Metric label="Customers" value={String(revenueByCustomer.length)} /></div>{revenueByCustomer.length ? <TableShell><table className="w-full text-sm"><thead className="bg-muted/60"><tr><Th>Customer</Th><Th>Invoices</Th><Th right>Revenue</Th></tr></thead><tbody>{revenueByCustomer.map((row) => <tr key={row.name} className="border-t border-border"><Td strong>{row.name}</Td><Td>{row.invoices}</Td><Td right strong>{money(row.revenue)}</Td></tr>)}</tbody></table></TableShell> : <EmptyState text="No invoiced revenue in this period." />}</div>;
      case "revenue-technician":
        return <div className="space-y-5"><div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">This report uses billable technician time multiplied by the billing rate recorded on each time entry. It does not split whole-invoice revenue across technicians.</div>{revenueByTechnician.length ? <TableShell><table className="w-full text-sm"><thead className="bg-muted/60"><tr><Th>Technician</Th><Th>Jobs</Th><Th right>Labour Revenue</Th></tr></thead><tbody>{revenueByTechnician.map((row) => <tr key={row.id} className="border-t border-border"><Td strong>{row.name}</Td><Td>{row.jobs}</Td><Td right strong>{money(row.revenue)}</Td></tr>)}</tbody></table></TableShell> : <EmptyState text="No technician-linked revenue in this period." />}</div>;
      case "revenue-service":
        return revenueByService.length ? <TableShell><table className="w-full text-sm"><thead className="bg-muted/60"><tr><Th>Service / Job Type</Th><Th>Invoices</Th><Th right>Revenue</Th></tr></thead><tbody>{revenueByService.map((row) => <tr key={row.name} className="border-t border-border"><Td strong>{row.name}</Td><Td>{row.invoices}</Td><Td right strong>{money(row.revenue)}</Td></tr>)}</tbody></table></TableShell> : <EmptyState text="No service revenue in this period." />;
      case "revenue-location":
        return revenueByLocation.length ? <TableShell><table className="w-full text-sm"><thead className="bg-muted/60"><tr><Th>Location</Th><Th>Invoices</Th><Th right>Revenue</Th></tr></thead><tbody>{revenueByLocation.map((row) => <tr key={row.name} className="border-t border-border"><Td strong>{row.name}</Td><Td>{row.invoices}</Td><Td right strong>{money(row.revenue)}</Td></tr>)}</tbody></table></TableShell> : <EmptyState text="No location-linked revenue in this period." />;
      case "revenue-month":
        return revenueByMonth.length ? <TableShell><table className="w-full text-sm"><thead className="bg-muted/60"><tr><Th>Month</Th><Th>Invoices</Th><Th right>Revenue</Th></tr></thead><tbody>{revenueByMonth.map((row) => <tr key={row.month} className="border-t border-border"><Td strong>{row.month}</Td><Td>{row.invoices}</Td><Td right strong>{money(row.revenue)}</Td></tr>)}</tbody></table></TableShell> : <EmptyState text="No monthly revenue in this period." />;
      case "sales-tax-summary":
        return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Metric label="Tax Charged" value={money(periodTax)} subtext="Tax on recognized invoices in the selected period" /><Metric label="Tax Collected" value={money(taxCashCollected)} subtext="Estimated tax portion of posted customer receipts" /><Metric label="Vendor Tax Recorded" value={money(vendorTaxRecorded)} subtext="Tax amounts on posted vendor bills in the selected period" /><Metric label="Tax Payable" value={money(taxPayableBalance)} subtext="Ledger balance of Sales Tax Payable through the end date" /></div>;
      case "tax-collected":
        return <div className="space-y-5"><div className="grid gap-4 md:grid-cols-2"><Metric label="Estimated Tax Collected" value={money(taxCashCollected)} /><Metric label="Customer Receipts" value={money(periodCustomerPayments)} /></div><div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">For partial payments, FieldOps allocates the payment proportionally between invoice subtotal and tax for this cash-collected view. The accounting liability remains ledger based.</div></div>;
      case "tax-payable":
        return <div className="space-y-5"><div className="grid gap-4 md:grid-cols-2"><Metric label="Sales Tax Payable" value={money(taxPayableBalance)} /><Metric label="Tax Charged This Period" value={money(periodTax)} /></div>{taxPayableAccount ? <TableShell><table className="w-full text-sm"><thead className="bg-muted/60"><tr><Th>Code</Th><Th>Account</Th><Th>Normal Balance</Th><Th right>Balance</Th></tr></thead><tbody><tr className="border-t border-border"><Td>{taxPayableAccount.code}</Td><Td strong>{taxPayableAccount.name}</Td><Td>{taxPayableAccount.normal_balance}</Td><Td right strong>{money(taxPayableBalance)}</Td></tr></tbody></table></TableShell> : <EmptyState text="No Sales Tax Payable ledger account was found." />}</div>;
      case "job-profitability":
        return jobProfitability.length ? <TableShell><table className="w-full text-sm"><thead className="bg-muted/60"><tr><Th>Work Order</Th><Th>Title</Th><Th right>Revenue</Th><Th right>Labor</Th><Th right>Materials</Th><Th right>Gross Margin</Th><Th right>Margin %</Th></tr></thead><tbody>{jobProfitability.map((row) => <tr key={row.id} className="border-t border-border"><Td strong>{row.number}</Td><Td>{row.title}</Td><Td right>{money(row.revenue)}</Td><Td right>{money(row.labor)}</Td><Td right>{money(row.material)}</Td><Td right strong>{money(row.margin)}</Td><Td right strong>{pct(row.marginPct)}</Td></tr>)}</tbody></table></TableShell> : <EmptyState text="No job profitability data in this period." />;
      case "technician-profitability":
        return technicianProfitability.length ? <TableShell><table className="w-full text-sm"><thead className="bg-muted/60"><tr><Th>Technician</Th><Th right>Allocated Revenue</Th><Th right>Labor Cost</Th><Th right>Contribution</Th><Th right>Contribution %</Th></tr></thead><tbody>{technicianProfitability.map((row) => <tr key={row.id} className="border-t border-border"><Td strong>{row.name}</Td><Td right>{money(row.revenue)}</Td><Td right>{money(row.labor)}</Td><Td right strong>{money(row.margin)}</Td><Td right strong>{pct(row.marginPct)}</Td></tr>)}</tbody></table></TableShell> : <EmptyState text="No technician profitability data in this period." />;
      case "labor-cost":
        return laborByTechnician.length ? <TableShell><table className="w-full text-sm"><thead className="bg-muted/60"><tr><Th>Technician</Th><Th right>Total Hours</Th><Th right>Billable Hours</Th><Th right>Labor Cost</Th></tr></thead><tbody>{laborByTechnician.map((row) => <tr key={row.id} className="border-t border-border"><Td strong>{row.name}</Td><Td right>{(row.minutes / 60).toFixed(2)}</Td><Td right>{(row.billableMinutes / 60).toFixed(2)}</Td><Td right strong>{money(row.cost)}</Td></tr>)}</tbody></table></TableShell> : <EmptyState text="No labor time entries in this period." />;
      case "material-cost":
        return materialCostRows.length ? <TableShell><table className="w-full text-sm"><thead className="bg-muted/60"><tr><Th>Material</Th><Th>Work Orders</Th><Th right>Net Quantity</Th><Th right>Cost</Th></tr></thead><tbody>{materialCostRows.map((row) => <tr key={row.description} className="border-t border-border"><Td strong>{row.description}</Td><Td>{row.workOrderCount}</Td><Td right>{row.quantity.toFixed(2)}</Td><Td right strong>{money(row.cost)}</Td></tr>)}</tbody></table></TableShell> : <EmptyState text="No material usage in this period." />;
      case "gross-margin-job":
        return jobProfitability.length ? <div className="space-y-5"><div className="grid gap-4 md:grid-cols-3"><Metric label="Revenue" value={money(jobProfitability.reduce((sum, row) => sum + row.revenue, 0))} /><Metric label="Direct Cost" value={money(jobProfitability.reduce((sum, row) => sum + row.labor + row.material, 0))} /><Metric label="Gross Margin" value={money(jobProfitability.reduce((sum, row) => sum + row.margin, 0))} /></div><TableShell><table className="w-full text-sm"><thead className="bg-muted/60"><tr><Th>Work Order</Th><Th>Title</Th><Th right>Revenue</Th><Th right>Direct Cost</Th><Th right>Margin</Th><Th right>Margin %</Th></tr></thead><tbody>{jobProfitability.map((row) => <tr key={row.id} className="border-t border-border"><Td strong>{row.number}</Td><Td>{row.title}</Td><Td right>{money(row.revenue)}</Td><Td right>{money(row.labor + row.material)}</Td><Td right strong>{money(row.margin)}</Td><Td right strong>{pct(row.marginPct)}</Td></tr>)}</tbody></table></TableShell></div> : <EmptyState text="No gross-margin data in this period." />;
      default:
        return <EmptyState text="This report is not available." />;
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen grid-cols-[236px_1fr]">
        <FieldOpsSidebar />

        <section className="min-w-0">
          <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
            <div className="flex h-10 w-[420px] items-center gap-2 rounded-xl border border-border px-3 text-sm text-muted-foreground">
              <Search className="h-4 w-4" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reports..." className="w-full bg-transparent outline-none placeholder:text-muted-foreground" />
            </div>
            <div className="flex items-center gap-2">
              <FieldOpsThemeToggle />
              <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-border" aria-label="Notifications"><Bell className="h-4 w-4" /></button>
            </div>
          </header>

          <div className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-sm font-bold text-primary">Finance & Accounting</div>
                <h1 className="mt-1 text-3xl font-black">Reports</h1>
                <p className="mt-2 text-sm text-muted-foreground">Financial statements, receivables, payables, revenue, tax and job profitability in one place.</p>
              </div>
              <button onClick={() => void loadData()} disabled={loading} className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-black hover:bg-muted disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</button>
            </div>



            {error ? <div className="mt-5 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{error}</div> : null}
            {loading ? <div className="mt-6 rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">Loading report data...</div> : null}

            {!loading && !activeReport ? (
              <div className="mt-6 space-y-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <SummaryMetric
                    label="Invoiced Revenue"
                    value={money(periodRevenue)}
                    subtext={`${periodInvoices.length} invoices in selected period`}
                    onViewDetails={() => setSummaryDetail("invoiced-revenue")}
                  />
                  <SummaryMetric
                    label="Customer Payments"
                    value={money(periodCustomerPayments)}
                    subtext={`${periodPayments.length} posted payments`}
                    onViewDetails={() => setSummaryDetail("customer-payments")}
                  />
                  <SummaryMetric
                    label="Open A/R"
                    value={money(openInvoices.reduce((sum, row) => sum + num(row.balance_due), 0))}
                    subtext={`${openInvoices.length} outstanding invoices`}
                    onViewDetails={() => setSummaryDetail("open-ar")}
                  />
                  <SummaryMetric
                    label="Open A/P"
                    value={money(openVendorBills.reduce((sum, row) => sum + num(row.balance_due), 0))}
                    subtext={`${openVendorBills.length} outstanding bills`}
                    onViewDetails={() => setSummaryDetail("open-ap")}
                  />
                </div>

                <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                      <CalendarDays className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black">Report Date Range</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Choose the period used by invoiced revenue, customer payments and period-based reports.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
                    <label className="block">
                      <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-muted-foreground">From</span>
                      <input
                        type="date"
                        value={fromDate}
                        onChange={(event) => setFromDate(event.target.value)}
                        max={toDate || undefined}
                        className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-muted-foreground">To</span>
                      <input
                        type="date"
                        value={toDate}
                        onChange={(event) => setToDate(event.target.value)}
                        min={fromDate || undefined}
                        className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        setFromDate("");
                        setToDate("");
                      }}
                      disabled={!fromDate && !toDate}
                      className="h-11 rounded-xl border border-border bg-background px-4 text-sm font-black hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Clear dates
                    </button>
                  </div>
                </section>

                {filteredCategories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <section key={category.title} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-primary/10 p-2.5 text-primary"><Icon className="h-5 w-5" /></div>
                        <div><h2 className="text-lg font-black">{category.title}</h2><p className="mt-1 text-sm text-muted-foreground">{category.description}</p></div>
                      </div>
                      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {category.reports.map(([key, title, description]) => (
                          <button key={key} onClick={() => setActiveReport(key)} className="group rounded-xl border border-border bg-background p-4 text-left transition hover:border-primary/50 hover:bg-muted/60">
                            <div className="flex items-start justify-between gap-3"><div><div className="font-black group-hover:text-primary">{title}</div><div className="mt-1 text-xs leading-5 text-muted-foreground">{description}</div></div><FileBarChart2 className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" /></div>
                          </button>
                        ))}
                      </div>
                    </section>
                  );
                })}

                {filteredCategories.length === 0 ? <EmptyState text="No reports match your search." /> : null}
              </div>
            ) : null}

            {!loading && activeReport ? (
              <div className="mt-6 space-y-5">
                <button onClick={() => setActiveReport(null)} className="flex items-center gap-2 text-sm font-black text-primary hover:underline"><ArrowLeft className="h-4 w-4" />Back to Reports</button>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <SectionTitle title={reportTitle(activeReport)} description={reportPeriodDescription(activeReport)} />
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs text-muted-foreground"><CalendarDays className="h-4 w-4" />{reportPeriodBadge(activeReport)}</div>
                </div>
                {renderReport(activeReport)}
              </div>
            ) : null}

            {summaryDetail ? (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) setSummaryDetail(null);
                }}
              >
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="summary-detail-title"
                  className="flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
                >
                  <div className="flex items-start justify-between gap-4 border-b border-border bg-card px-5 py-4">
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.14em] text-primary">Report details</div>
                      <h2 id="summary-detail-title" className="mt-1 text-xl font-black">{summaryDetailTitle(summaryDetail)}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">{summaryDetailDescription(summaryDetail)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSummaryDetail(null)}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background hover:bg-muted"
                      aria-label="Close details"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="overflow-y-auto p-5">
                    {renderSummaryDetail(summaryDetail)}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
