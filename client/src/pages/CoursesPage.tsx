import { useState } from "react";
import { Link } from "wouter";
import { ArrowUpLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Reveal from "@/components/Reveal";
import SiteLayout from "@/components/SiteLayout";
import CourseWaitlistDialog from "@/components/CourseWaitlistDialog";
import { useSpotlight } from "@/hooks/useSpotlight";
import { COURSES } from "@/data/academyContent";
import { buildCourseEnquiryLink } from "@/lib/contact";
import { trpc } from "@/lib/trpc";

/**
 * The standalone course catalogue, linked from the main navigation. The same
 * cards as the home page so a visitor recognises the catalogue, with each card
 * anchored by its slug so the footer links land on the right course.
 */
export default function CoursesPage() {
  const trackSpotlight = useSpotlight();
  const [waitCourse, setWaitCourse] = useState<string | null>(null);
  const offerings = trpc.site.courses.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
  });
  const statusByCourse = new Map(
    (offerings.data ?? []).map(item => [item.course, item.status]),
  );

  return (
    <SiteLayout>
      <section className="relative overflow-hidden border-b border-border/60 bg-card/40">
        <div className="pointer-events-none absolute -start-32 top-0 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-20">
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
              للأعمار من 6 إلى 17 سنة
            </div>
          </Reveal>
          <Reveal delay={70}>
            <h1 className="mt-6 text-3xl font-extrabold tracking-tight md:text-5xl">دوراتنا التعليمية</h1>
          </Reveal>
          <Reveal delay={140}>
            <p className="mt-4 max-w-2xl text-sm leading-8 text-muted-foreground md:text-base">
              اكتشف عالم البرمجة والتكنولوجيا من خلال دوراتنا المصممة خصيصًا لعمر ابنك واهتماماته — من
              الأساسيات حتى مشروع حقيقي يشوفه شغال قدامه.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {COURSES.map((course, index) => {
              const status = statusByCourse.get(course.title as "Scratch" | "Robotics" | "Web" | "Python");
              return (
              <Reveal key={course.slug} delay={(index % 4) * 80}>
                <article
                  id={course.slug}
                  onPointerMove={trackSpotlight}
                  className="spotlight group flex h-full scroll-mt-28 flex-col overflow-hidden rounded-3xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/40"
                >
                  <div className={`flex h-36 items-center justify-center bg-gradient-to-br ${course.accent}`}>
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
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-lg font-bold" dir="ltr">
                        {course.title}
                      </h2>
                      {status ? (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          {status === "live" ? "Live" : status === "waiting_list" ? "Waiting list" : "Coming soon"}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-primary">
                      {course.facts.map(fact => (
                        <span key={fact} className="rounded-full bg-primary/10 px-2.5 py-1">
                          {fact}
                        </span>
                      ))}
                    </div>
                    <p className="mt-4 flex-1 text-sm leading-7 text-muted-foreground">{course.description}</p>
                    {status === "live" ? (
                      <a
                        href={buildCourseEnquiryLink(course.title)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-6 block"
                      >
                        <Button className="w-full rounded-full">احجز مكانك</Button>
                      </a>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-6 w-full rounded-full"
                        disabled={!status}
                        onClick={() => setWaitCourse(course.title)}
                      >
                        {status ? "Join waiting list" : "Checking availability…"}
                      </Button>
                    )}
                  </div>
                </article>
              </Reveal>
              );
            })}
          </div>

          <Reveal delay={120}>
            <div className="mt-14 flex flex-col items-center justify-center gap-4 rounded-3xl border border-border bg-card/60 p-8 text-center">
              <p className="text-sm leading-8 text-muted-foreground md:text-base">
                مش لاقي الكورس المناسب؟ ابعتلنا ومحتاجين نساعدك تختار المسار الصح لابنك.
              </p>
              <Link href="/register">
                <Button size="lg" className="rounded-full px-7 shadow-xl shadow-primary/20">
                  سجل الآن
                  <ArrowUpLeft className="ms-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <CourseWaitlistDialog
        open={waitCourse !== null}
        onOpenChange={open => {
          if (!open) setWaitCourse(null);
        }}
        course={waitCourse}
      />
    </SiteLayout>
  );
}
