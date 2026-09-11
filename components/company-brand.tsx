"use client";

import { useEffect, useMemo, useState } from "react";
import { Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type CompanyBrandState = {
  name: string;
  logoPath: string | null;
};

export function CompanyBrand({
  subtitle = "Service Operations",
  className = "",
  nameClassName = "font-bold",
  subtitleClassName = "text-xs text-muted-foreground",
  iconClassName = "h-10 w-10 rounded-xl",
  compact = false,
  documentTitle = true,
}: {
  subtitle?: string;
  className?: string;
  nameClassName?: string;
  subtitleClassName?: string;
  iconClassName?: string;
  compact?: boolean;
  documentTitle?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [brand, setBrand] = useState<CompanyBrandState>({
    name: "FieldOps",
    logoPath: null,
  });
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadBrand() {
      const { data } = await supabase
        .from("fieldops_settings")
        .select("company_name,logo_path")
        .eq("id", 1)
        .maybeSingle();

      if (!active || !data) return;

      setBrand({
        name: data.company_name?.trim() || "FieldOps",
        logoPath: data.logo_path || null,
      });
    }

    void loadBrand();

    const channel = supabase
      .channel(`company-brand-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "fieldops_settings", filter: "id=eq.1" },
        () => void loadBrand(),
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [supabase]);

  useEffect(() => {
    setLogoFailed(false);
  }, [brand.logoPath]);

  useEffect(() => {
    if (!documentTitle) return;
    document.title = `${brand.name} | Service Operations`;
  }, [brand.name, documentTitle]);

  const logoUrl = useMemo(() => {
    if (!brand.logoPath) return null;
    return supabase.storage.from("company-branding").getPublicUrl(brand.logoPath).data.publicUrl;
  }, [brand.logoPath, supabase]);

  const iconSize = compact ? "h-9 w-9" : "h-10 w-10";

  return (
    <div className={`flex min-w-0 items-center gap-3 ${className}`}>
      {logoUrl && !logoFailed ? (
        <div className={`${iconSize} ${iconClassName} flex shrink-0 items-center justify-center overflow-hidden border border-border bg-white`}>
          <img
            src={logoUrl}
            alt={`${brand.name} logo`}
            className="h-full w-full object-contain p-1"
            onError={() => setLogoFailed(true)}
          />
        </div>
      ) : (
        <div className={`${iconSize} ${iconClassName} flex shrink-0 items-center justify-center bg-primary text-primary-foreground`}>
          <Wrench className={compact ? "h-4 w-4" : "h-5 w-5"} />
        </div>
      )}
      <div className="min-w-0">
        <div className={`truncate ${nameClassName}`} title={brand.name}>
          {brand.name}
        </div>
        <div className={subtitleClassName}>{subtitle}</div>
      </div>
    </div>
  );
}
