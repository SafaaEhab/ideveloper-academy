import { useState, type CSSProperties } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FacebookIcon, LinkedInIcon, WhatsAppIcon } from "@/components/BrandIcons";
import { LOGO_ALT, LOGO_URL } from "@/lib/brand";
import { SOCIAL_LINKS } from "@/lib/contact";

// Each network wears its own brand colour — WhatsApp's green (the same #25D366
// the announcement button uses), Facebook's blue, and LinkedIn's blue — so a
// visitor recognises the channel before reading the tooltip. The rail itself
// stays the academy's black and the hover fills with that colour.
const channels = [
  { key: "whatsapp", label: "واتساب", href: SOCIAL_LINKS.whatsapp, icon: WhatsAppIcon, color: "#25D366" },
  { key: "facebook", label: "فيسبوك", href: SOCIAL_LINKS.facebook, icon: FacebookIcon, color: "#1877F2" },
  { key: "linkedin", label: "لينكدإن", href: SOCIAL_LINKS.linkedin, icon: LinkedInIcon, color: "#0A66C2" },
] as const;

// The colour arrives as a CSS variable rather than a class name so Tailwind
// still sees a static string here and keeps generating the arbitrary-value rules.
const linkClass =
  "flex h-14 w-14 items-center justify-center text-[var(--channel-color)] transition-colors duration-200 hover:bg-[var(--channel-color)] hover:text-brand-paper focus-visible:bg-[var(--channel-color)] focus-visible:text-brand-paper focus-visible:outline-none [&_svg]:size-6";

// If the hosted logo cannot be reached, fall back to the mark it draws rather than
// leaving a broken image sitting in the rail.
function BrandMark({ className }: { className: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className={`flex items-center justify-center rounded-full bg-brand-navy font-bold text-brand-paper ${className}`} aria-label={LOGO_ALT} role="img">
        iD
      </span>
    );
  }
  return <img src={LOGO_URL} alt={LOGO_ALT} onError={() => setFailed(true)} className={className} />;
}

/**
 * The contact rail pinned to the right edge of the home page. A vertical rail only
 * fits where the centred page leaves a gutter (the layout caps at 1280px), so on
 * narrower screens the same three links lie flat along the bottom instead of
 * covering the content.
 */
export default function SocialLinksBar() {
  return (
    <>
      {/* Wide screens: a vertical rail on the right edge. */}
      <div className="fixed right-0 top-1/2 z-40 hidden -translate-y-1/2 flex-col overflow-hidden rounded-l-2xl border border-r-0 border-brand-mist/20 bg-brand-ink shadow-2xl shadow-black/40 min-[1360px]:flex">
        <div className="flex items-center justify-center border-b border-brand-mist/15 bg-brand-paper p-3">
          <BrandMark className="h-9 w-9 rounded-full" />
        </div>
        {channels.map(channel => (
          <Tooltip key={channel.key}>
            <TooltipTrigger asChild>
              <a href={channel.href} target="_blank" rel="noopener noreferrer" aria-label={channel.label} className={linkClass} style={{ "--channel-color": channel.color } as CSSProperties}>
                <channel.icon />
              </a>
            </TooltipTrigger>
            <TooltipContent side="left">{channel.label}</TooltipContent>
          </Tooltip>
        ))}
      </div>

      {/* Narrower screens: the same three links along the bottom edge. */}
      <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 min-[1360px]:hidden">
        <div className="flex items-center overflow-hidden rounded-full border border-brand-mist/20 bg-brand-ink shadow-2xl shadow-black/40">
          <BrandMark className="ms-1 h-8 w-8 shrink-0 rounded-full bg-brand-paper p-0.5" />
          {channels.map(channel => (
            <a
              key={channel.key}
              href={channel.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={channel.label}
              className={`${linkClass} h-12 w-14`}
              style={{ "--channel-color": channel.color } as CSSProperties}
            >
              <channel.icon />
            </a>
          ))}
        </div>
      </div>
    </>
  );
}