import { APP_NAME, DISCLAIMER, OPEN_METEO_ATTRIBUTION } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="mt-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 pb-6 text-[13px] leading-normal text-muted-foreground">
        <p>{DISCLAIMER}</p>
        <p>
          <a href={OPEN_METEO_ATTRIBUTION.url} className="text-primary underline underline-offset-2 hover:text-primary-hover">
            {OPEN_METEO_ATTRIBUTION.label}
          </a>{" "}
          (
          <a
            href={OPEN_METEO_ATTRIBUTION.licenseUrl}
            className="text-primary underline underline-offset-2 hover:text-primary-hover"
          >
            {OPEN_METEO_ATTRIBUTION.licenseLabel}
          </a>
          ) · © {new Date().getFullYear()} {APP_NAME}
        </p>
      </div>
    </footer>
  );
}
