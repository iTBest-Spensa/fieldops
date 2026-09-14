"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="text-sm font-semibold text-muted-foreground">
        Opening FieldOps...
      </div>
    </main>
  );
}