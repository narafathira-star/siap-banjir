"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TombolMuatUlang() {
  return (
    <Button size="lg" onClick={() => window.location.reload()}>
      <RefreshCw aria-hidden="true" />
      Coba lagi
    </Button>
  );
}
