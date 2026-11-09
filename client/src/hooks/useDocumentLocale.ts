import { useEffect } from "react";

/**
 * Keeps the document language and direction in sync with the page that is
 * currently mounted.
 *
 * The public marketing shell, the Arabic student/leads workspaces and the
 * English admin/sign-in screens all share one HTML document. Without this,
 * whichever route loaded first leaves `lang`/`dir` behind for every later
 * route, which changes how screen readers pronounce the content and how the
 * browser orders the page.
 *
 * The previous values are restored on unmount so a route that intentionally
 * keeps the document default (for example the English not-found screen) does
 * not inherit Arabic direction from the page the visitor just left.
 */
export function useDocumentLocale(lang: "ar" | "en", dir: "rtl" | "ltr") {
  useEffect(() => {
    const root = document.documentElement;
    const previousLang = root.getAttribute("lang");
    const previousDir = root.getAttribute("dir");

    root.setAttribute("lang", lang);
    root.setAttribute("dir", dir);

    return () => {
      if (previousLang === null) root.removeAttribute("lang");
      else root.setAttribute("lang", previousLang);

      if (previousDir === null) root.removeAttribute("dir");
      else root.setAttribute("dir", previousDir);
    };
  }, [dir, lang]);
}
