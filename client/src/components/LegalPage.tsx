import Reveal from "@/components/Reveal";
import SiteLayout from "@/components/SiteLayout";

export type LegalSection = {
  heading: string;
  body?: string;
  bullets?: string[];
  note?: string;
};

type LegalPageProps = {
  title: string;
  subtitle: string;
  intro: string;
  sections: LegalSection[];
  contactNote: string;
};

/**
 * Shared shell for the terms and privacy pages, so both read as one family and
 * follow the same hierarchy: title lead-in, then numbered sections with clear
 * bullets and optional highlighted notes.
 */
export default function LegalPage({ title, subtitle, intro, sections, contactNote }: LegalPageProps) {
  return (
    <SiteLayout>
      <section className="relative overflow-hidden border-b border-border/60 bg-card/40">
        <div className="pointer-events-none absolute -start-32 top-0 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-20">
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
              iDeveloper Academy
            </div>
          </Reveal>
          <Reveal delay={70}>
            <h1 className="mt-6 text-3xl font-extrabold tracking-tight md:text-5xl">{title}</h1>
          </Reveal>
          <Reveal delay={140}>
            <p className="mt-4 max-w-2xl text-sm leading-8 text-muted-foreground md:text-base">{subtitle}</p>
          </Reveal>
        </div>
      </section>

      <section className="py-12 lg:py-16">
        <div className="mx-auto max-w-3xl px-5 lg:px-8">
          <Reveal>
            <p className="text-sm leading-8 text-muted-foreground md:text-base">{intro}</p>
          </Reveal>

          <div className="mt-10 space-y-8">
            {sections.map((section, index) => (
              <Reveal key={section.heading} delay={Math.min(index * 60, 240)}>
                <article className="rounded-3xl border border-border bg-card/60 p-6 md:p-7">
                  <h2 className="text-lg font-bold">{section.heading}</h2>
                  {section.body && (
                    <p className="mt-3 text-sm leading-8 text-muted-foreground">{section.body}</p>
                  )}
                  {section.bullets && (
                    <ul className="mt-3 space-y-2">
                      {section.bullets.map(bullet => (
                        <li key={bullet} className="flex items-start gap-3 text-sm leading-8 text-muted-foreground">
                          <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {section.note && (
                    <p className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs leading-6 text-muted-foreground">
                      <span className="font-bold text-primary">ملاحظة هامة: </span>
                      {section.note}
                    </p>
                  )}
                </article>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <div className="mt-10 rounded-3xl border border-border bg-card/60 p-6 md:p-7">
              <h2 className="text-lg font-bold">التواصل معنا</h2>
              <p className="mt-3 text-sm leading-8 text-muted-foreground">{contactNote}</p>
              <a
                href="tel:+201062302368"
                className="mt-3 inline-flex text-sm font-semibold text-primary"
                dir="ltr"
              >
                01062302368
              </a>
            </div>
          </Reveal>
        </div>
      </section>
    </SiteLayout>
  );
}
