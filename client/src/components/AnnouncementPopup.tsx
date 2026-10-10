import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/BrandIcons";
import {
  CalendarClock,
  Sparkles,
  Trophy,
  Users,
  Video,
  X,
} from "lucide-react";
import {
  ANNOUNCEMENT_LABELS,
  buildAnnouncementWhatsAppLink,
  formatRemaining,
  getDeadlineRemaining,
  type Announcement,
} from "@/lib/announcement";
import { trpc } from "@/lib/trpc";

const factIcons = [Users, Sparkles, Video] as const;

// Give the landing page a moment to paint before the overlay covers it, so the
// announcement feels like it arrived on top of the site rather than instead of it.
const OPEN_DELAY_MS = 450;

function useCountdown(target: string | null) {
  const [remaining, setRemaining] = useState(() => getDeadlineRemaining(target));

  useEffect(() => {
    setRemaining(getDeadlineRemaining(target));
    if (!target) return;
    const id = setInterval(() => setRemaining(getDeadlineRemaining(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  return remaining;
}

function CountdownCell({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-background px-1 py-1.5 text-center ring-1 ring-border/70">
      <div className="text-sm font-bold leading-none tabular-nums">{String(value).padStart(2, "0")}</div>
      <div className="mt-1 text-[10px] leading-none text-muted-foreground">{label}</div>
    </div>
  );
}

export default function AnnouncementPopup() {
  // The admin panel and the lessons have to stay usable, so the announcement only
  // greets visitors on the public site.
  const [location] = useLocation();
  const onPublicSite = location === "/" || location === "";

  // The site has to render even when the API is unreachable, so a failed request
  // simply means no announcement rather than a broken popup.
  const announcement = trpc.site.announcement.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
  });

  // null = the admin has no announcement switched on, so nothing pops up.
  const current: Announcement | null = announcement.data ?? null;
  const remaining = useCountdown(current?.deadline ?? null);
  const { days, hours, minutes, seconds } = formatRemaining(remaining);
  const showCountdown = !!current?.deadline && remaining > 0;

  // Starts closed so the landing page paints first; the timer below opens it on
  // every load, which is what the academy asked for.
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (announcement.isPending) return;
    setReady(true);
  }, [announcement.isPending]);

  useEffect(() => {
    if (!ready || !current || !onPublicSite) {
      setOpen(false);
      return;
    }
    const id = setTimeout(() => setOpen(true), OPEN_DELAY_MS);
    return () => clearTimeout(id);
  }, [ready, current?.id, onPublicSite]);

  if (!current || !onPublicSite) return null;

  const cta = current.ctaLabel || ANNOUNCEMENT_LABELS.defaultCta;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        dir="rtl"
        showCloseButton={false}
        overlayClassName="bg-slate-950/70 backdrop-blur-sm"
        className="max-h-[calc(100dvh-1.5rem)] max-w-[calc(100%-1.5rem)] gap-0 overflow-y-auto overscroll-contain rounded-[1.5rem] border-border/60 bg-background p-0 shadow-2xl shadow-black/50 sm:max-w-[30rem] sm:rounded-[1.75rem]"
      >
        <div className="relative overflow-hidden bg-gradient-to-bl from-[#1e40af] via-[#2563eb] to-[#1d4ed8] px-5 pb-6 pt-5 text-white sm:px-7 sm:pb-7">
          <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-cyan-300/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-20 h-52 w-52 rounded-full bg-amber-300/20 blur-3xl" />
          <CodeMarks />

          <DialogClose
            asChild
            className="absolute left-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 outline-none backdrop-blur transition-colors hover:bg-white/25 hover:text-white focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <button type="button" aria-label="إغلاق الإعلان">
              <X className="h-4 w-4" />
            </button>
          </DialogClose>

          <div className="relative">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 backdrop-blur">
                <Trophy className="h-5 w-5 text-amber-300" />
              </span>
              {current.badge && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold backdrop-blur">
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  {current.badge}
                </span>
              )}
            </div>

            <DialogTitle className="mt-4 text-xl font-bold leading-snug tracking-tight sm:text-[1.7rem]">
              {current.title}
            </DialogTitle>
            {current.headline && (
              <p className="mt-1 text-base font-semibold text-white/85 sm:text-lg">{current.headline}</p>
            )}
            {current.body && (
              <DialogDescription className="mt-2.5 text-[13px] leading-6 text-white/70">
                {current.body}
              </DialogDescription>
            )}
          </div>
        </div>

        <div className="px-5 py-5 sm:px-7 sm:py-6">
          {current.facts.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {current.facts.map((fact, index) => {
                const Icon = factIcons[index % factIcons.length];
                return (
                  <li
                    key={fact}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground"
                  >
                    <Icon className="h-3.5 w-3.5 text-primary" />
                    {fact}
                  </li>
                );
              })}
            </ul>
          )}

          {showCountdown && (
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-muted/40 px-3 py-2.5">
              <div className="flex shrink-0 items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5 text-primary" />
                {ANNOUNCEMENT_LABELS.deadlineLabel}
              </div>
              <div className="grid flex-1 grid-cols-4 gap-1.5">
                <CountdownCell value={days} label={ANNOUNCEMENT_LABELS.countdownUnits.days} />
                <CountdownCell value={hours} label={ANNOUNCEMENT_LABELS.countdownUnits.hours} />
                <CountdownCell value={minutes} label={ANNOUNCEMENT_LABELS.countdownUnits.minutes} />
                <CountdownCell value={seconds} label={ANNOUNCEMENT_LABELS.countdownUnits.seconds} />
              </div>
            </div>
          )}

          {current.deadline && !showCountdown && (
            <p className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-[13px] font-semibold text-amber-700 dark:text-amber-300">
              {ANNOUNCEMENT_LABELS.startedLabel}
            </p>
          )}

          {current.prizes.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {current.prizes.map(prize => (
                <li
                  key={prize.place}
                  className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-3 py-2 text-[13px] ring-1 ring-border/60"
                >
                  <span className="shrink-0 font-semibold">{prize.place}</span>
                  <span className="truncate text-muted-foreground">{prize.reward}</span>
                </li>
              ))}
            </ul>
          )}

          <Button
            asChild
            size="lg"
            className="mt-5 h-12 w-full rounded-full bg-[#25D366] text-base font-bold text-white shadow-lg shadow-[#25D366]/30 hover:bg-[#1eb455] hover:text-white"
          >
            <a href={buildAnnouncementWhatsAppLink(current)} target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon className="h-5 w-5" />
              {cta}
            </a>
          </Button>

          <div className="mt-2.5 text-center">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full px-3 py-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {ANNOUNCEMENT_LABELS.skip}
            </button>
            <p className="text-[11px] text-muted-foreground/80">
              {current.ctaHint || ANNOUNCEMENT_LABELS.defaultHint}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Faint code glyphs in the hero so the banner reads as "coding academy"
// without competing with the headline.
function CodeMarks() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 select-none overflow-hidden font-mono text-[11px] text-white/15"
    >
      <span className="absolute right-5 top-7 animate-[float-slow_9s_ease-in-out_infinite]">
        {"{ }"}
      </span>
      <span className="absolute left-24 top-6 animate-[float-slow_11s_ease-in-out_infinite] [animation-delay:-3s]">
        &lt;/&gt;
      </span>
      <span className="absolute left-6 top-24 animate-[float-slow_10s_ease-in-out_infinite] [animation-delay:-1.5s]">
        01
      </span>
      <span className="absolute right-7 bottom-6 animate-[float-slow_13s_ease-in-out_infinite] [animation-delay:-2s]">
        ( )
      </span>
    </div>
  );
}