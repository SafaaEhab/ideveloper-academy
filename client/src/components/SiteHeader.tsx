import { useEffect, useState } from "react";
import { Link } from "wouter";
import { LogIn, Moon, Sun } from "lucide-react";
import AcademyLogo from "@/components/AcademyLogo";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { NAV_ITEMS } from "@/data/academyContent";

/**
 * The shared public header. It is sticky on every page and carries the same
 * two pieces of feedback the landing page had: the hairline that tightens once
 * the page moves, and the reading-progress bar (right-to-left aware).
 */
export default function SiteHeader() {
  const { theme, toggleTheme } = useTheme();
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

  return (
    <header
      className={`sticky top-0 z-30 border-b bg-background/85 backdrop-blur transition-[box-shadow,border-color] duration-300 ${
        scrolled ? "border-border shadow-[0_10px_30px_-24px_rgba(0,0,0,.55)]" : "border-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <AcademyLogo />
          <span className="hidden text-[11px] leading-tight text-muted-foreground sm:block">
            أكاديمية البرمجة والروبوتات للأطفال
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
          {NAV_ITEMS.map(item => (
            <a key={item.href} href={item.href} className="transition-colors hover:text-foreground">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="تبديل الوضع الليلي">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Link href="/student">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full px-3 text-xs sm:px-4 sm:text-sm"
            >
              <LogIn className="me-1.5 h-3.5 w-3.5" />
              للمشتركين
            </Button>
          </Link>
          <Link href="/register">
            <Button size="sm" className="rounded-full px-3 text-xs sm:px-4 sm:text-sm">
              اشترك الآن
            </Button>
          </Link>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-transparent" aria-hidden>
        <div
          className="h-full origin-right bg-gradient-to-l from-primary via-sky-400 to-emerald-400"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>
    </header>
  );
}
