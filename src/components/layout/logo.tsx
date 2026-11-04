import { cn } from "@/lib/utils";

/** Logo Siap Banjir: perisai dengan tetes air (desain ulang, D-046). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("size-[30px]", className)}>
      <path d="M12 2 4 5v6.5c0 5 3.4 9.1 8 10.5 4.6-1.4 8-5.5 8-10.5V5l-8-3z" className="fill-primary" />
      <path d="M12 7s3.2 3.4 3.2 5.8a3.2 3.2 0 0 1-6.4 0C8.8 10.4 12 7 12 7z" className="fill-primary-foreground" />
    </svg>
  );
}
