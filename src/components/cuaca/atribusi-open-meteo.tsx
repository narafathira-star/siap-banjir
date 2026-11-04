import { OPEN_METEO_ATTRIBUTION } from "@/lib/constants";

export function AtribusiOpenMeteo() {
  return (
    <p className="text-xs text-muted-foreground">
      <a href={OPEN_METEO_ATTRIBUTION.url} className="underline underline-offset-2 hover:text-foreground">
        {OPEN_METEO_ATTRIBUTION.label}
      </a>{" "}
      ({OPEN_METEO_ATTRIBUTION.licenseLabel})
    </p>
  );
}
