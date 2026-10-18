import { useCallback, useEffect, useState, type PointerEvent } from "react";
import { Link } from "wouter";
import { ArrowUpLeft, Moon, Phone, Play, Sun, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import CountUp from "@/components/CountUp";
import Reveal from "@/components/Reveal";
import SocialLinksBar from "@/components/SocialLinksBar";
import { useTheme } from "@/contexts/ThemeContext";
import { useSpotlight } from "@/hooks/useSpotlight";
import { LOGO_ALT, LOGO_URL } from "@/lib/brand";
import { buildCourseEnquiryLink } from "@/lib/contact";
import { trpc } from "@/lib/trpc";
import {
  ACADEMY_ADDRESS_SHORT,
  ACADEMY_HOURS,
  ACADEMY_PHONE,
  ACADEMY_PHONE_E164,
  COURSES,
  FAQS,
  GALLERY_BODY,
  HERO_POINTS,
  HERO_SUB,
  IMAGE_BASE,
  JOURNEY_TABS,
  NAV_ITEMS,
  OFFERINGS,
  STUDENT_PHOTOS,
  TEAM,
  YOUTUBE_EMBED_ORIGIN,
} from "@/data/academyContent";

const t = {
  brand: "iDeveloper Academy",
  tagline: "أكاديمية البرمجة والروبوتات للأطفال",
  subscribe: "اشترك الآن فى كورساتنا",
  studentPortal: "بوابة الطالب",
  heroEyebrow: "للأعمار من 6 إلى 17 سنة",
  heroTitle: "طريقك لاحتراف البرمجة",
  browseCourses: "تعرف على كورساتنا",
  journeyTitle: "شوف لقطات من رحلتنا",
  aboutTitle: "ماذا تقدم الأكاديمية",
  coursesTitle: "دوراتنا التعليمية",
  coursesSub:
    "اكتشف عالم البرمجة والتكنولوجيا من خلال دوراتنا المصممة خصيصًا لتنمية مهاراتك",
  bookSeat: "احجز مكانك",
  teamTitle: "تعرف على المدربين",
  teamLabel: "Director",
  projectsTitle: "تعرف على مبرمجى المستقبل",
  ctaTitle: "عايز تطور ابنك ويكون جاهز لسوق العمل؟",
  ctaPoints: [
    "جهّزه لسوق العمل من الآن، لأن العالم يتغير بسرعة، والسوق محتاج سرعة تعلم ومهارات جديدة — وكل ده هتلاقيه عندنا في الأكاديمية.",
    "دورات مصممة خصيصًا لعمره واهتماماته.",
    "تعلم البرمجة بشكل تفاعلي وممتع.",
    "تأسيس قوي لمهارات المستقبل.",
  ],
  ctaFooter: "ابدأ معنا الآن، وعلمه مهارات المستقبل بخطوات صحيحة!",
  ctaButton: "سجل بسهولة، واجعل أول خطوة في مشواره تبدأ من هنا",
  faqTitle: "الأسئلة الشائعة",
  faqFooter: "ابدأ معنا الآن، وعلمه مهارات المستقبل بخطوات صحيحة!",
  achievements: "الإنجازات",
  achievementsSub: "أحدث إنجازاتنا",
  achievementsEmpty: "النتيجة الجاية بتحضّر دلوقتي — تابعونا قريبًا.",
  footerLinks: "الوصول السريع",
  footerCourses: "الكورسات التي نقدمها",
  footerRegister: "سجل في الكورسات",
  footerTeam: "تعرف على المدربين",
  footerContact: "تواصل معنا",
  rights: "جميع الحقوق محفوظة.",
  credits: "Developed by Safaa Ehab",
  terms: "الشروط والأحكام",
  privacy: "سياسة الخصوصية",
};

const waLink = `https://wa.me/${ACADEMY_PHONE_E164}`;

/** Counts shown under the hero, derived from the real catalogue and roster. */
const HERO_STATS = [
  { value: COURSES.length, suffix: "", prefix: "", label: "كورس تعليمي" },
  { value: TEAM.length, suffix: "", prefix: "", label: "مدرّب ومدرّبة" },
  { value: 10, suffix: "+", prefix: "", label: "تراك متخصص" },
];

/**
 * The single academy mark, shared with the social rail, the student portal and
 * the admin dashboard through `lib/brand`. If the hosted image cannot be reached
 * it falls back to the letterforms rather than leaving a broken image behind.
 */
function AcademyLogo({ className }: { className?: string }) {
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

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const [journeyTab, setJourneyTab] = useState(JOURNEY_TABS[0].id);
  // The home page must render even when the API is unreachable, so failures fall back to no cards.
  const achievements = trpc.site.achievements.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
  });
  const achievementCards = achievements.data ?? [];
  const activeJourney = JOURNEY_TABS.find(tab => tab.id === journeyTab) ?? JOURNEY_TABS[0];
  const trackSpotlight = useSpotlight();

  // The header tightens once the page moves, and a hairline progress bar tracks
  // how far down a long catalogue the visitor is. Both read from one rAF loop so
  // a fast scroll never queues up layout work per event.
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setScrolled(window.scrollY > 12);
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(scrollable > 0 ? Math.min(1, window.scrollY / scrollable) : 0);
    };
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  // The page is Arabic, so the document itself has to flip — that is what makes
  // the browser render it right-to-left (text order, list bullets, scroll origin)
  // instead of only mirroring the handful of elements that use logical padding.
  useEffect(() => {
    const root = document.documentElement;
    const previousDir = root.getAttribute("dir");
    const previousLang = root.getAttribute("lang");
    root.setAttribute("dir", "rtl");
    root.setAttribute("lang", "ar");
    return () => {
      if (previousDir === null) root.removeAttribute("dir");
      else root.setAttribute("dir", previousDir);
      if (previousLang === null) root.removeAttribute("lang");
      else root.setAttribute("lang", previousLang);
    };
  }, []);

  return (
    <div className="min-h-screen overflow-hidden bg-background text-foreground">
      <SocialLinksBar />

      <header
        className={`sticky top-0 z-30 border-b bg-background/85 backdrop-blur transition-[box-shadow,border-color] duration-300 ${
          scrolled ? "border-border shadow-[0_10px_30px_-24px_rgba(0,0,0,.55)]" : "border-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <AcademyLogo />
            <span className="hidden text-[11px] leading-tight text-muted-foreground sm:block">
              {t.tagline}
            </span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
            {NAV_ITEMS.map(item => (
              <a key={item.href} href={item.href} className="transition-colors hover:text-foreground">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="تبديل الوضع الليلي">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Link href="/student">
              <Button size="sm" className="rounded-full px-4">
                {t.subscribe}
              </Button>
            </Link>
          </div>
        </div>
        {/* Reading progress. The page is RTL, so the bar grows from the right. */}
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-transparent" aria-hidden>
          <div
            className="h-full origin-right bg-gradient-to-l from-primary via-sky-400 to-emerald-400"
            style={{ transform: `scaleX(${progress})` }}
          />
        </div>
      </header>

      <main id="top">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -start-40 top-0 h-96 w-96 animate-drift rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 end-0 h-[26rem] w-[26rem] animate-drift-late rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-24">
            <div className="relative">
              <Reveal y={16}>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                  {t.heroEyebrow}
                </div>
              </Reveal>

              <Reveal delay={70}>
                <h1 className="mt-6 text-4xl font-extrabold leading-[1.15] tracking-tight md:text-6xl">
                  طريقك لاحتراف <span className="text-primary">البرمجة</span>
                </h1>
              </Reveal>

              <Reveal delay={140}>
                <p className="mt-6 max-w-xl text-base leading-9 text-muted-foreground md:text-lg">
                  {HERO_SUB}
                </p>
              </Reveal>

              <ul className="mt-8 space-y-3">
                {HERO_POINTS.map((point, index) => (
                  <Reveal as="li" key={point} delay={210 + index * 80} y={14}>
                    <span className="flex items-start gap-3 text-sm leading-7 text-muted-foreground md:text-base">
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      <span>{point}</span>
                    </span>
                  </Reveal>
                ))}
              </ul>

              <Reveal delay={390}>
                <div className="mt-10">
                  <a href="#courses">
                    <Button size="lg" className="rounded-full px-7 shadow-xl shadow-primary/20">
                      {t.browseCourses}
                      <ArrowUpLeft className="ms-2 h-5 w-5" />
                    </Button>
                  </a>
                </div>
              </Reveal>

              <Reveal delay={480}>
                <dl className="mt-12 grid max-w-lg grid-cols-3 gap-4 border-t border-border pt-8">
                  {HERO_STATS.map(stat => (
                    <div key={stat.label}>
                      <dt className="sr-only">{stat.label}</dt>
                      <dd>
                        <span className="block text-3xl font-extrabold tracking-tight text-foreground">
                          {stat.prefix}
                          <CountUp value={stat.value} />
                          {stat.suffix}
                        </span>
                        <span className="mt-1.5 block text-xs leading-6 text-muted-foreground">{stat.label}</span>
                      </dd>
                    </div>
                  ))}
                </dl>
              </Reveal>
            </div>

            <Reveal delay={220} y={36} className="relative">
              <div className="absolute -inset-4 animate-drift rounded-[2.5rem] bg-primary/10 blur-2xl" />
              {/* The illustration is white-keyed art, so the plate is tinted in the
                  light theme and deep navy in the dark one to keep it from
                  vanishing into a white page or glowing against a black one. */}
              <div className="relative overflow-hidden rounded-[2rem] border border-border bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100 p-6 shadow-2xl dark:from-[#192b4d] dark:via-[#101827] dark:to-[#080b12]">
                <img
                  src={`${IMAGE_BASE}/feature.png`}
                  alt="أدوات البرمجة والتكنولوجيا"
                  className="w-full object-contain"
                  loading="lazy"
                />
              </div>
            </Reveal>
          </div>
        </section>

        {/* Journey / promo */}
        <section id="journey" className="border-y border-border/60 bg-card/40 py-16">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <Reveal>
              <h2 className="text-2xl font-bold tracking-tight md:text-4xl">{t.journeyTitle}</h2>
            </Reveal>

            <div className="mt-8 grid gap-6 lg:grid-cols-[.75fr_1.25fr]">
              <div className="space-y-2">
                {JOURNEY_TABS.map((tab, index) => (
                  <Reveal key={tab.id} delay={index * 60}>
                    <button
                      type="button"
                      onClick={() => setJourneyTab(tab.id)}
                      aria-pressed={tab.id === journeyTab}
                      className={`flex w-full items-center gap-3 rounded-2xl border px-5 py-4 text-start text-sm font-semibold transition-colors ${
                        tab.id === journeyTab
                          ? "border-primary/50 bg-primary/10 text-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      <Play
                        className={`h-4 w-4 shrink-0 ${tab.id === journeyTab ? "text-primary" : "text-muted-foreground/60"}`}
                      />
                      <span className="min-w-0 flex-1">{tab.title}</span>
                    </button>
                  </Reveal>
                ))}
              </div>

              {/* `key` remounts the player on every tab change, so switching videos
                  stops the previous one instead of leaving it playing underneath. */}
              <Reveal delay={120} y={30}>
                <div
                  key={activeJourney.id}
                  className="animate-fade-slide-in overflow-hidden rounded-3xl border border-border bg-background shadow-xl"
                >
                  <div className="aspect-video w-full bg-black">
                    <iframe
                      className="h-full w-full"
                      src={`${YOUTUBE_EMBED_ORIGIN}/embed/${activeJourney.videoId}?rel=0`}
                      title={activeJourney.title}
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />
                  </div>
                  <div className="border-t border-border px-5 py-4">
                    <h3 className="font-bold">{activeJourney.title}</h3>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* About / offerings */}
        <section id="about" className="border-y border-border/60 bg-card/40 py-16">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <Reveal>
              <h2 className="text-2xl font-bold tracking-tight md:text-4xl">{t.aboutTitle}</h2>
            </Reveal>
            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {OFFERINGS.map((item, index) => (
                <Reveal key={item.title} delay={index * 70}>
                  <article
                    onPointerMove={trackSpotlight}
                    className="spotlight h-full rounded-3xl border border-border bg-background p-6 transition-colors hover:border-primary/40"
                  >
                    <div className="text-lg font-bold">{item.title}</div>
                    <p className="mt-3 text-sm leading-8 text-muted-foreground">{item.body}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Courses */}
        <section id="courses" className="py-16 lg:py-24">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="max-w-2xl">
              <Reveal>
                <h2 className="text-2xl font-bold tracking-tight md:text-4xl">{t.coursesTitle}</h2>
              </Reveal>
              <Reveal delay={90}>
                <p className="mt-4 text-sm leading-8 text-muted-foreground md:text-base">{t.coursesSub}</p>
              </Reveal>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {COURSES.map((course, index) => (
                <Reveal key={course.slug} delay={(index % 4) * 80}>
                  <article
                    onPointerMove={trackSpotlight}
                    className="spotlight group flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/40"
                  >
                    <div className={`flex h-36 items-center justify-center bg-gradient-to-br ${course.accent}`}>
                      {/* The marks are artwork on white, so they sit on a plate —
                          otherwise each one reads as a stray white rectangle
                          floating in the colour band. */}
                      <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
                        <img
                          src={course.icon}
                          alt=""
                          loading="lazy"
                          className="h-12 w-12 object-contain transition-transform duration-300 group-hover:scale-110"
                        />
                      </span>
                    </div>

                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="text-lg font-bold" dir="ltr">
                        {course.title}
                      </h3>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-primary">
                        {course.facts.map(fact => (
                          <span key={fact} className="rounded-full bg-primary/10 px-2.5 py-1">
                            {fact}
                          </span>
                        ))}
                      </div>
                      <p className="mt-4 flex-1 text-sm leading-7 text-muted-foreground">{course.description}</p>
                      <a
                        href={buildCourseEnquiryLink(course.title)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-6 block"
                      >
                        <Button className="w-full rounded-full">{t.bookSeat}</Button>
                      </a>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Team */}
        <section id="team" className="border-y border-border/60 bg-card/40 py-16">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <Reveal>
              <h2 className="text-2xl font-bold tracking-tight md:text-4xl">{t.teamTitle}</h2>
            </Reveal>
            <Reveal delay={80}>
              <div className="mt-4 text-sm font-semibold uppercase tracking-[.2em] text-primary">{t.teamLabel}</div>
            </Reveal>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {TEAM.map((member, index) => (
                <Reveal key={member.name} delay={(index % 3) * 70}>
                  <article
                    onPointerMove={trackSpotlight}
                    className="spotlight flex h-full items-center gap-4 rounded-3xl border border-border bg-background p-5 transition-colors hover:border-primary/40"
                  >
                    {member.photo ? (
                      <img
                        src={member.photo}
                        alt={member.name}
                        loading="lazy"
                        className="h-16 w-16 shrink-0 rounded-2xl object-cover"
                      />
                    ) : (
                      <span
                        aria-hidden
                        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-lg font-bold text-primary"
                      >
                        {member.name.replace(/^م\//, "").trim().slice(0, 1)}
                      </span>
                    )}
                    <div className="min-w-0">
                      <h3 className="truncate font-bold">{member.name}</h3>
                      <p dir="ltr" className="mt-1 text-start text-xs leading-6 text-muted-foreground">
                        {member.role}
                      </p>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Student projects */}
        <section id="projects" className="py-16">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <Reveal>
              <div className="rounded-[2rem] border border-border bg-gradient-to-br from-primary/15 via-background to-background p-8 md:p-12">
                <h2 className="text-2xl font-bold tracking-tight md:text-4xl">{t.projectsTitle}</h2>
                <p className="mt-5 max-w-3xl text-sm leading-9 text-muted-foreground md:text-base">{GALLERY_BODY}</p>
                <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                  {STUDENT_PHOTOS.map((photo, index) => (
                    <Reveal key={photo.src} delay={(index % 5) * 60} y={20} className="h-full">
                      <figure className="h-full overflow-hidden rounded-2xl border border-border bg-background">
                        <img
                          src={photo.src}
                          alt={photo.alt}
                          loading="lazy"
                          className="aspect-[4/5] w-full object-cover transition-transform duration-500 hover:scale-105"
                        />
                      </figure>
                    </Reveal>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* CTA */}
        <section className="border-y border-border/60 bg-card/40 py-16">
          <div className="mx-auto max-w-4xl px-5 text-center lg:px-8">
            <Reveal>
              <h2 className="text-2xl font-extrabold tracking-tight md:text-4xl">🚀 {t.ctaTitle}</h2>
            </Reveal>
            <ul className="mx-auto mt-8 max-w-2xl space-y-3 text-start">
              {t.ctaPoints.map((point, index) => (
                <Reveal as="li" key={point} delay={index * 80} y={14}>
                  <span className="flex items-start gap-3 text-sm leading-8 text-muted-foreground md:text-base">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    <span>{point}</span>
                  </span>
                </Reveal>
              ))}
            </ul>
            <Reveal delay={200}>
              <div className="mt-8">
                <p className="text-sm font-semibold text-primary">🌟 {t.ctaFooter}</p>
                <Link href="/student" className="mt-6 inline-block">
                  <Button size="lg" className="rounded-full px-8 shadow-xl shadow-primary/20">
                    📲 {t.ctaButton}
                  </Button>
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-16 lg:py-24">
          <div className="mx-auto max-w-4xl px-5 lg:px-8">
            <Reveal>
              <h2 className="text-center text-2xl font-bold tracking-tight md:text-4xl">{t.faqTitle}</h2>
            </Reveal>
            <Reveal delay={90}>
              <Accordion type="single" collapsible className="mt-10">
                {FAQS.map((faq, index) => (
                  <AccordionItem key={faq.question} value={`faq-${index}`}>
                    <AccordionTrigger className="text-start text-base">{faq.question}</AccordionTrigger>
                    <AccordionContent className="text-sm leading-8 text-muted-foreground">{faq.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Reveal>
            <Reveal delay={140}>
              <p className="mt-10 text-center text-sm font-semibold text-primary">🌟 {t.faqFooter}</p>
            </Reveal>
          </div>
        </section>

        {/* Achievements */}
        <section id="achievements" className="border-t border-border/60 bg-card/40 py-16">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <Reveal>
              <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[.2em] text-primary">
                    🎖 {t.achievements}
                  </div>
                  <h2 className="mt-3 text-2xl font-bold tracking-tight md:text-4xl">{t.achievementsSub}</h2>
                </div>
                <div className="flex items-center gap-2 whitespace-nowrap text-sm text-muted-foreground">
                  <Trophy className="h-4 w-4 text-primary" />
                  {achievementCards.length} {achievementCards.length === 1 ? "نتيجة" : "نتائج"}
                </div>
              </div>
            </Reveal>

            {achievementCards.length === 0 ? (
              <div className="mt-12 rounded-3xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
                {t.achievementsEmpty}
              </div>
            ) : (
              <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {achievementCards.map((item, index) => (
                  <Reveal key={item.id} delay={(index % 3) * 80}>
                    <article
                      onPointerMove={trackSpotlight}
                      className="spotlight group flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-background transition-all duration-300 hover:-translate-y-1 hover:border-primary/40"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.title || item.description}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                            <Trophy className="h-8 w-8 opacity-40" />
                            <span className="text-xs">لا توجد صورة بعد</span>
                          </div>
                        )}
                        {item.tag && (
                          <span className="absolute end-3 top-3 rounded-full bg-background/90 px-3 py-1 text-xs font-semibold shadow-sm backdrop-blur">
                            {item.tag}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col items-center gap-2 p-6 text-center">
                        {item.title && (
                          <h3 className="text-sm font-bold uppercase tracking-[.15em] text-primary">{item.title}</h3>
                        )}
                        {item.achievedOn && (
                          <div className="text-xl font-bold tracking-tight" dir="ltr">
                            {item.achievedOn}
                          </div>
                        )}
                        <p className="text-sm leading-7 text-muted-foreground">{item.description}</p>
                      </div>
                    </article>
                  </Reveal>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 bg-card/40 px-5 py-12 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-3">
              <AcademyLogo className="h-11" />
              <div className="text-sm font-bold">{t.brand}</div>
            </div>
            <p className="mt-4 text-xs leading-7 text-muted-foreground">{ACADEMY_ADDRESS_SHORT}</p>
            <a
              href={`tel:${ACADEMY_PHONE_E164}`}
              className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-primary"
              dir="ltr"
            >
              <Phone className="h-4 w-4" />
              {ACADEMY_PHONE}
            </a>
          </div>

          <div>
            <h3 className="text-sm font-bold">{t.footerLinks}</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#about" className="transition-colors hover:text-foreground">
                  عن الأكاديمية
                </a>
              </li>
              <li>
                <a href="#courses" className="transition-colors hover:text-foreground">
                  الكورسات
                </a>
              </li>
              <li>
                <a href="#projects" className="transition-colors hover:text-foreground">
                  مشاريع الطلبة
                </a>
              </li>
              <li>
                <a href="#team" className="transition-colors hover:text-foreground">
                  {t.footerTeam}
                </a>
              </li>
              <li>
                <a href="#faq" className="transition-colors hover:text-foreground">
                  {t.faqTitle}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold">{t.footerCourses}</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {COURSES.map(course => (
                <li key={course.slug}>
                  <a href="#courses" className="transition-colors hover:text-foreground" dir="ltr">
                    {course.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold">{t.footerContact}</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/student" className="transition-colors hover:text-foreground">
                  {t.footerRegister}
                </Link>
              </li>
              <li>
                <a href={waLink} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-foreground">
                  واتساب
                </a>
              </li>
              <li>
                <span>{ACADEMY_HOURS}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mx-auto mt-10 flex max-w-7xl flex-col gap-2 border-t border-border pt-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <div>© {new Date().getFullYear()} iDeveloper Academy. {t.rights}</div>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href="https://ideveloper-academy.com/terms%26conditions.html"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-foreground"
            >
              {t.terms}
            </a>
            <a
              href="https://ideveloper-academy.com/privacypolicy.html"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-foreground"
            >
              {t.privacy}
            </a>
            <span>{t.credits}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}