"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function upgradeNavigation() {
  document.querySelectorAll<HTMLAnchorElement>('a[href="/billing"]').forEach((anchor) => {
    if (anchor.dataset.accountsWorkspaceLink === "true") return;
    anchor.href = "/accounts";
    anchor.querySelectorAll<HTMLElement>("span").forEach((node) => {
      if (node.textContent?.trim() === "Billing") node.textContent = "Accounts";
    });
    for (const node of Array.from(anchor.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim() === "Billing") {
        node.textContent = node.textContent.replace("Billing", "Accounts");
      }
    }
  });

  document.querySelectorAll<HTMLAnchorElement>('a[href="/reports"]').forEach((anchor) => {
    const nav = anchor.closest("nav");
    if (nav) anchor.style.display = "none";
  });
}

export function FieldOpsAccountsNavigation() {
  const pathname = usePathname();

  useEffect(() => {
    upgradeNavigation();
    const observer = new MutationObserver(() => upgradeNavigation());
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
