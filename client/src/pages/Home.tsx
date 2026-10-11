import { Link } from "wouter";
import { ArrowUpRight, BookOpen, Code2, Moon, Sun, Trophy, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import SocialLinksBar from "@/components/SocialLinksBar";
import { useTheme } from "@/contexts/ThemeContext";
import { LOGO_ALT, LOGO_URL } from "@/lib/brand";
import { trpc } from "@/lib/trpc";

const t = { navStudent: "Student portal", eyebrow: "Build the future, one line at a time", title: "A brighter start for\nthe next generation of builders.", sub: "iDeveloper turns curiosity into confidence through playful, practical coding education for young creators.", enter: "Enter student portal", explore: "Explore the academy", programs: "Learning paths", programsSub: "Four focused tracks. One creative mindset.", why: "Where young minds become makers", badge: "Made for curious minds", footer: "Learn boldly. Create kindly. Ship proudly.", achievements: "Achievements", achievementsSub: "Where our learners stood out, competition after competition.", achievementsEmpty: "The next result is being prepared — check back soon." };
const courses = [
  { name: "Scratch", icon: "✦", color: "from-sky-500/25 to-blue-500/5" },
  { name: "Robotics", icon: "◉", color: "from-violet-500/25 to-fuchsia-500/5" },
  { name: "Web", icon: "⌘", color: "from-emerald-500/25 to-teal-500/5" },
  { name: "Python", icon: "⟡", color: "from-amber-500/25 to-orange-500/5" },
];

/** Achievement bodies are usually Arabic, on an otherwise left-to-right page. */
const readsArabic = (value: string) => /[\u0600-\u06FF]/.test(value);

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  // The home page must render even when the API is unreachable, so failures fall back to no cards.
  const achievements = trpc.site.achievements.useQuery(undefined, { retry: false, staleTime: 60_000 });
  const achievementCards = achievements.data ?? [];

  return <div className="min-h-screen overflow-hidden bg-background text-foreground">
    <SocialLinksBar />
    <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8">
      <Link href="/" className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-white ring-2 ring-primary/30"><img src={LOGO_URL} alt={LOGO_ALT} className="h-full w-full object-cover" /></span><div className="text-sm font-bold tracking-wide">iDeveloper</div></Link>
      <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex"><a href="#programs" className="transition-colors hover:text-foreground">{t.programs}</a><a href="#achievements" className="transition-colors hover:text-foreground">{t.achievements}</a><a href="#why" className="transition-colors hover:text-foreground">{t.why}</a></nav>
      <div className="flex items-center gap-2"><Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">{theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</Button><Link href="/student"><Button size="sm" className="rounded-full px-4">{t.navStudent}<ArrowUpRight className="ms-1 h-4 w-4" /></Button></Link></div>
    </header>

    <main>
      <section className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-16 lg:grid-cols-[1.1fr_.9fr] lg:px-8 lg:pb-32 lg:pt-24">
        <div className="pointer-events-none absolute -left-40 top-0 h-96 w-96 rounded-full bg-primary/10 blur-3xl" /><div className="relative"><div className="mb-7 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"><Zap className="h-3.5 w-3.5" />{t.eyebrow}</div><h1 className="max-w-2xl whitespace-pre-line text-5xl font-bold leading-[1.06] tracking-[-.04em] md:text-7xl">{t.title}</h1><p className="mt-7 max-w-xl text-lg leading-8 text-muted-foreground">{t.sub}</p><div className="mt-9 flex flex-wrap gap-3"><Link href="/student"><Button size="lg" className="rounded-full px-6 shadow-xl shadow-primary/20">{t.enter}<ArrowUpRight className="ms-2 h-5 w-5" /></Button></Link><a href="#programs"><Button size="lg" variant="outline" className="rounded-full px-6">{t.explore}</Button></a></div><div className="mt-12 flex items-center gap-7 text-sm text-muted-foreground"><div className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" />Group learning</div><div className="flex items-center gap-2"><Code2 className="h-4 w-4 text-primary" />Real projects</div></div></div>
        <div className="relative"><div className="absolute -inset-5 rounded-[2.5rem] bg-primary/10 blur-2xl" /><div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#192b4d] via-[#101827] to-[#080b12] p-7 shadow-2xl"><div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-primary/30 blur-3xl" /><div className="relative flex items-center justify-between"><span className="font-mono text-xs text-blue-200/70">// your next chapter</span><span className="rounded-full border border-white/15 px-2 py-1 text-[10px] text-white/60">01 / 04</span></div><div className="relative mt-14"><div className="font-mono text-sm text-blue-300">const <span className="text-white">future</span> =</div><div className="mt-2 text-4xl font-bold tracking-tight text-white">yours to build<span className="text-primary">.</span></div><div className="mt-8 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full w-2/3 rounded-full bg-gradient-to-r from-blue-400 to-primary" /></div><div className="mt-3 flex justify-between text-xs text-white/50"><span>learning momentum</span><span>67%</span></div></div><div className="relative mt-20 grid grid-cols-2 gap-3"><div className="rounded-2xl border border-white/10 bg-white/5 p-4"><BookOpen className="h-5 w-5 text-blue-300" /><div className="mt-4 text-sm font-semibold text-white">4 tracks</div><div className="mt-1 text-xs text-white/50">one creative lab</div></div><div className="rounded-2xl border border-white/10 bg-white/5 p-4"><Code2 className="h-5 w-5 text-emerald-300" /><div className="mt-4 text-sm font-semibold text-white">∞ ideas</div><div className="mt-1 text-xs text-white/50">ready to ship</div></div></div></div></div>
      </section>

      <section id="programs" className="border-y border-border/60 bg-card/40 py-20"><div className="mx-auto max-w-7xl px-5 lg:px-8"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><div className="text-sm font-semibold uppercase tracking-[.2em] text-primary">{t.programs}</div><h2 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">{t.programsSub}</h2></div><div className="text-sm text-muted-foreground">{t.badge}</div></div><div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{courses.map((course, i) => <div key={course.name} className={`group relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br ${course.color} p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40`}><div className="flex items-start justify-between"><span className="text-3xl text-primary">{course.icon}</span><span className="text-xs text-muted-foreground">0{i + 1}</span></div><h3 className="mt-12 text-xl font-bold">{course.name}</h3><p className="mt-2 text-sm text-muted-foreground">{course.name}</p></div>)}</div></div></section>
      <section id="achievements" className="border-y border-border/60 bg-card/40 py-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[.2em] text-primary">{t.achievements}</div>
              <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">{t.achievementsSub}</h2>
            </div>
            <div className="flex items-center gap-2 whitespace-nowrap text-sm text-muted-foreground">
              <Trophy className="h-4 w-4 text-primary" />
              {achievementCards.length} {achievementCards.length === 1 ? "result" : "results"}
            </div>
          </div>

          {achievementCards.length === 0 ? (
            <div className="mt-12 rounded-3xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
              {t.achievementsEmpty}
            </div>
          ) : (
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {achievementCards.map(item => (
                <article key={item.id} className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-background transition-all duration-300 hover:-translate-y-1 hover:border-primary/40">
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.title || item.description} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Trophy className="h-8 w-8 opacity-40" />
                        <span className="text-xs">No photo yet</span>
                      </div>
                    )}
                    {item.tag && <span className="absolute end-3 top-3 rounded-full bg-background/90 px-3 py-1 text-xs font-semibold shadow-sm backdrop-blur">{item.tag}</span>}
                  </div>
                  <div className="flex flex-1 flex-col items-center gap-2 p-6 text-center">
                    {item.title && <h3 className="text-sm font-bold uppercase tracking-[.15em] text-primary">{item.title}</h3>}
                    {item.achievedOn && <div className="text-xl font-bold tracking-tight" dir="ltr">{item.achievedOn}</div>}
                    <p className="text-sm leading-7 text-muted-foreground" dir={readsArabic(item.description) ? "rtl" : "ltr"}>{item.description}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="why" className="mx-auto max-w-7xl px-5 py-20 lg:px-8"><div className="grid gap-10 md:grid-cols-3"><div className="md:col-span-1"><div className="text-sm font-semibold uppercase tracking-[.2em] text-primary">{t.why}</div><h2 className="mt-4 text-3xl font-bold tracking-tight">Education that leaves a mark, not just a lesson.</h2></div><div className="grid gap-8 md:col-span-2 md:grid-cols-2"><div><div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Code2 className="h-5 w-5" /></div><h3 className="font-bold">Learn by doing</h3><p className="mt-2 text-sm leading-7 text-muted-foreground">Every idea becomes an experiment and a small project that makes understanding stick.</p></div><div><div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Users className="h-5 w-5" /></div><h3 className="font-bold">Small groups, big support</h3><p className="mt-2 text-sm leading-7 text-muted-foreground">Organized groups, clear schedules, and a safe space to ask, try, and grow.</p></div></div></div></section>
    </main>
    <footer className="border-t border-border/60 px-5 py-8 lg:px-8"><div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between"><div className="font-semibold text-foreground">iDeveloper</div><div>{t.footer}</div><div>© 2026</div></div></footer>
  </div>;
}
