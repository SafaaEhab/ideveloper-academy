import { Link } from "wouter";
import { Phone } from "lucide-react";
import AcademyLogo from "@/components/AcademyLogo";
import {
  ACADEMY_ADDRESS_SHORT,
  ACADEMY_HOURS,
  ACADEMY_PHONE,
  ACADEMY_PHONE_E164,
  COURSES,
} from "@/data/academyContent";

const waLink = `https://wa.me/${ACADEMY_PHONE_E164}`;

const quickLinks = [
  { href: "/#about", label: "عن الأكاديمية" },
  { href: "/courses", label: "الكورسات" },
  { href: "/#projects", label: "مشاريع الطلبة" },
  { href: "/#faq", label: "الأسئلة الشائعة" },
  { href: "/register", label: "التسجيل" },
];

/**
 * The shared public footer: academy contact details, quick links, the course
 * list, and the legal pages. Legal links are internal routes now, not exits to
 * the old site.
 */
export default function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-card/40 px-5 py-12 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <AcademyLogo className="h-11" />
            <div className="text-sm font-bold">iDeveloper Academy</div>
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
          <h3 className="text-sm font-bold">الوصول السريع</h3>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {quickLinks.map(link => (
              <li key={link.href}>
                <a href={link.href} className="transition-colors hover:text-foreground">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-bold">الكورسات التي نقدمها</h3>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {COURSES.map(course => (
              <li key={course.slug}>
                <a
                  href={`/courses#${course.slug}`}
                  className="transition-colors hover:text-foreground"
                  dir="ltr"
                >
                  {course.title}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-bold">تواصل معنا</h3>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link href="/register" className="transition-colors hover:text-foreground">
                سجل في الكورسات
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
        <div>© {new Date().getFullYear()} iDeveloper Academy. جميع الحقوق محفوظة.</div>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/terms" className="transition-colors hover:text-foreground">
            الشروط والأحكام
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-foreground">
            سياسة الخصوصية
          </Link>
          <span>Developed by Safaa Ehab</span>
        </div>
      </div>
    </footer>
  );
}
