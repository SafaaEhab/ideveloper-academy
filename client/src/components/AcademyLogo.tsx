import { useState } from "react";
import { LOGO_ALT, LOGO_URL } from "@/lib/brand";

/**
 * The single academy mark, shared by the header, the footer and any page that
 * needs it. If the hosted image cannot be reached it falls back to the
 * letterforms rather than leaving a broken image behind.
 */
export default function AcademyLogo({ className }: { className?: string }) {
  const [failed, setFailed] = useState(false);
  const size = className ?? "h-12 w-12";
  if (failed) {
    return (
      <span
        className={`flex shrink-0 items-center justify-center rounded-full bg-brand-navy font-bold text-brand-paper ${size}`}
        role="img"
        aria-label={LOGO_ALT}
      >
        iD
      </span>
    );
  }
  return <img src={LOGO_URL} alt={LOGO_ALT} onError={() => setFailed(true)} className={`${size} rounded-full object-cover`} />;
}
