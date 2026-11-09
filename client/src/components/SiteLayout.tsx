import { useEffect, type ReactNode } from "react";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import SocialLinksBar from "@/components/SocialLinksBar";
import { useDocumentLocale } from "@/hooks/useDocumentLocale";

/**
 * Shared public-page chrome: contact rail, sticky header, content, and footer.
 * The document is flipped to Arabic with `dir="rtl"` while a page is mounted,
 * because that is what makes the browser order text, lists and scroll origin
 * right-to-left instead of mirroring individual elements.
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  useDocumentLocale("ar", "rtl");

  /**
   * The pages render client-side, so the browser's own fragment scroll runs
   * before the anchor exists. Scroll once the target has mounted, and again
   * when images and fonts finish settling.
   */
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    const scroll = () => document.getElementById(id)?.scrollIntoView({ block: "start" });
    const frame = requestAnimationFrame(scroll);
    window.addEventListener("load", scroll, { once: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("load", scroll);
    };
  }, []);

  return (
    <div className="min-h-screen overflow-hidden bg-background text-foreground">
      <SocialLinksBar />
      <SiteHeader />
      <main id="top">{children}</main>
      <SiteFooter />
    </div>
  );
}
