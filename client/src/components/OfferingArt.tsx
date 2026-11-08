import type { ComponentType, SVGProps } from "react";

/**
 * Flat illustrations for the "what the academy offers" cards, drawn as inline
 * SVG so they stay crisp at any size and follow the theme through Tailwind fill
 * utilities (`fill-card`, `fill-primary`…). Each drawing mirrors its card: a
 * running first project, a small group with one student tracked, a trainer
 * pointing at the board, and a certificate beside an ascending report.
 */

type ArtProps = SVGProps<SVGSVGElement>;

/** A running project from day one: the student's code up, the robot on stage. */
export function HandsOnArt(props: ArtProps) {
  return (
    <svg viewBox="0 0 400 200" aria-hidden="true" {...props}>
      <rect width="400" height="200" rx="20" className="fill-primary/[0.07]" />

      <rect x="36" y="40" width="186" height="120" rx="12" className="fill-card stroke-border" strokeWidth="2" />
      <line x1="36" y1="68" x2="222" y2="68" className="stroke-border" strokeWidth="2" />
      <circle cx="54" cy="54" r="3.5" className="fill-[#f87171]" />
      <circle cx="66" cy="54" r="3.5" className="fill-[#fbbf24]" />
      <circle cx="78" cy="54" r="3.5" className="fill-[#34d399]" />

      <rect x="52" y="82" width="84" height="8" rx="4" className="fill-brand-navy" />
      <rect x="64" y="98" width="118" height="8" rx="4" className="fill-foreground/15" />
      <rect x="64" y="114" width="70" height="8" rx="4" className="fill-foreground/15" />
      <rect x="52" y="130" width="96" height="8" rx="4" className="fill-amber-500" />
      <rect x="156" y="128" width="3" height="12" rx="1.5" className="fill-amber-500" />

      <circle cx="248" cy="100" r="24" className="fill-primary" />
      <path d="M241 88.5 258 100l-17 11.5Z" className="fill-primary-foreground" />

      <line x1="314" y1="60" x2="314" y2="46" className="stroke-brand-navy" strokeWidth="4" strokeLinecap="round" />
      <circle cx="314" cy="40" r="5" className="fill-amber-500" />
      <rect x="270" y="58" width="88" height="62" rx="18" className="fill-brand-navy" />
      <circle cx="296" cy="86" r="7.5" className="fill-card" />
      <circle cx="332" cy="86" r="7.5" className="fill-card" />
      <path d="M300 102q14 12 28 0" fill="none" strokeWidth="3.5" strokeLinecap="round" className="stroke-card" />
      <rect x="292" y="124" width="44" height="30" rx="14" className="fill-primary" />
      <ellipse cx="314" cy="164" rx="66" ry="9" className="fill-primary/15" />
    </svg>
  );
}

/** A small group, with the tracked student ringed and scored on the meter. */
export function SmallGroupsArt(props: ArtProps) {
  return (
    <svg viewBox="0 0 400 200" aria-hidden="true" {...props}>
      <rect width="400" height="200" rx="20" className="fill-primary/[0.07]" />

      {[96, 304].map(x => (
        <g key={x}>
          <circle cx={x} cy="84" r="15" className="fill-muted-foreground/35" />
          <rect x={x - 24} y="102" width="48" height="30" rx="16" className="fill-muted-foreground/35" />
          <rect x={x - 36} y="138" width="72" height="9" rx="4.5" className="fill-foreground/10" />
          <rect x={x - 36} y="154" width={x === 96 ? 34 : 48} height="6" rx="3" className="fill-muted-foreground/30" />
        </g>
      ))}

      <circle cx="200" cy="84" r="15" className="fill-primary" />
      <rect x="176" y="102" width="48" height="30" rx="16" className="fill-primary" />
      <circle cx="200" cy="84" r="25" fill="none" strokeWidth="3" className="stroke-cyan-500" />
      <rect x="164" y="138" width="72" height="9" rx="4.5" className="fill-foreground/10" />
      <rect x="164" y="154" width="64" height="6" rx="3" className="fill-cyan-500" />

      <circle cx="200" cy="40" r="15" className="fill-cyan-500" />
      <path d="M193 40l5 5 10-10" fill="none" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="stroke-white" />
    </svg>
  );
}

/** A trainer pointing at the board while two students follow along. */
export function SpecialistsArt(props: ArtProps) {
  return (
    <svg viewBox="0 0 400 200" aria-hidden="true" {...props}>
      <rect width="400" height="200" rx="20" className="fill-primary/[0.07]" />

      <rect x="40" y="30" width="196" height="112" rx="14" className="fill-card stroke-border" strokeWidth="2" />
      <rect x="62" y="52" width="112" height="20" rx="9" className="fill-violet-500/85" />
      <rect x="78" y="80" width="88" height="20" rx="9" className="fill-violet-500/55" />
      <rect x="62" y="108" width="64" height="20" rx="9" className="fill-violet-500/70" />

      <circle cx="306" cy="78" r="15" className="fill-brand-navy" />
      <rect x="282" y="98" width="48" height="52" rx="18" className="fill-primary" />
      <line x1="288" y1="112" x2="242" y2="98" strokeWidth="9" strokeLinecap="round" className="stroke-primary" />
      <line x1="242" y1="98" x2="208" y2="87" strokeWidth="4" strokeLinecap="round" className="stroke-foreground/50" />
      <circle cx="206" cy="86" r="3.5" className="fill-violet-500" />
      <ellipse cx="306" cy="158" rx="42" ry="7" className="fill-primary/15" />

      <circle cx="86" cy="154" r="11" className="fill-muted-foreground/40" />
      <rect x="68" y="168" width="36" height="28" rx="13" className="fill-muted-foreground/40" />
      <line x1="70" y1="170" x2="56" y2="152" strokeWidth="7" strokeLinecap="round" className="stroke-muted-foreground/40" />
      <circle cx="53" cy="144" r="3" className="fill-violet-500" />

      <circle cx="150" cy="154" r="11" className="fill-muted-foreground/40" />
      <rect x="132" y="168" width="36" height="28" rx="13" className="fill-muted-foreground/40" />
    </svg>
  );
}

/** A sealed certificate beside a report whose bars climb — proof of progress. */
export function CertificateArt(props: ArtProps) {
  return (
    <svg viewBox="0 0 400 200" aria-hidden="true" {...props}>
      <rect width="400" height="200" rx="20" className="fill-primary/[0.07]" />

      <g transform="rotate(-6 148 100)">
        <rect x="70" y="44" width="156" height="112" rx="12" className="fill-card stroke-border" strokeWidth="2" />
        <rect x="94" y="64" width="90" height="9" rx="4.5" className="fill-brand-navy" />
        <rect x="94" y="86" width="112" height="6" rx="3" className="fill-foreground/15" />
        <rect x="94" y="98" width="112" height="6" rx="3" className="fill-foreground/15" />
        <rect x="94" y="118" width="52" height="5" rx="2.5" className="fill-foreground/30" />
        <circle cx="196" cy="126" r="15" className="fill-emerald-500" />
        <path d="M190 139l-7 22 10-6 5 8 4-24z" className="fill-emerald-600/80" />
        <path d="M190 126l4 4 8-8" fill="none" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="stroke-white" />
      </g>

      <rect x="252" y="40" width="112" height="126" rx="12" className="fill-card stroke-border" strokeWidth="2" />
      <rect x="268" y="56" width="56" height="8" rx="4" className="fill-foreground/25" />
      <rect x="268" y="126" width="14" height="24" rx="4" className="fill-emerald-500/25" />
      <rect x="291" y="114" width="14" height="36" rx="4" className="fill-emerald-500/45" />
      <rect x="314" y="102" width="14" height="48" rx="4" className="fill-emerald-500/65" />
      <rect x="337" y="90" width="14" height="60" rx="4" className="fill-emerald-500" />
      <rect x="268" y="150" width="83" height="3" rx="1.5" className="fill-foreground/15" />

      <circle cx="352" cy="52" r="14" className="fill-emerald-500" />
      <path d="M345 52l5 5 9-9" fill="none" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="stroke-white" />
    </svg>
  );
}

/** One illustration per `OFFERINGS` entry, in the same order. */
export const OFFERING_ART: ComponentType<ArtProps>[] = [
  HandsOnArt,
  SmallGroupsArt,
  SpecialistsArt,
  CertificateArt,
];
