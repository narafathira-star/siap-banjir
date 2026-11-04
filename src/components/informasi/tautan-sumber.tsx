import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Rujukan asli sebuah informasi; dibuka di tab baru tanpa mengirim referrer.
 * `label` "Tanggal kejadian" untuk sumber kedua riwayat (D-059).
 */
export function TautanSumber({
  nama,
  url,
  label = "Sumber",
  className,
}: {
  nama: string | null;
  url: string | null;
  label?: string;
  className?: string;
}) {
  if (!url) return null;
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      {label}:{" "}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-primary underline underline-offset-2 hover:no-underline"
      >
        {/* Inline (bukan inline-flex) agar nama sumber yang panjang mengalir setelah "Sumber:". */}
        {nama ?? new URL(url).hostname}
        <ExternalLink className="ml-1 inline size-3.5 align-[-2px]" aria-hidden="true" />
        <span className="sr-only">(membuka tab baru)</span>
      </a>
    </p>
  );
}
