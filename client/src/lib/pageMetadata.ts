export type PageMetadata = {
  title: string;
  description: string;
  canonicalPath: string;
};

export const SITE_ORIGIN = "https://ideveloper-academy.vercel.app";

const DEFAULT_DESCRIPTION =
  "أكاديمية iDeveloper في بنها — كورسات برمجة وروبوتات للأطفال من 6 إلى 17 سنة: Scratch وRobotics وWeb وPython.";

const NOT_FOUND_METADATA: PageMetadata = {
  title: "Page not found | iDeveloper Academy",
  description: "The page you requested could not be found.",
  canonicalPath: "/404",
};

/**
 * Normalizes a route for canonical URLs. Query strings are intentionally
 * dropped so `/admin?tab=leads` and `/admin` do not compete as two pages.
 */
export function canonicalPathFor(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  const withoutTrailingSlash = pathname.replace(/\/+$/, "");
  return withoutTrailingSlash || "/";
}

/**
 * One source of truth for route-specific SEO metadata. It is applied by
 * `RouteMetadata` on the client, so the static title in `index.html` remains a
 * sensible fallback for crawlers that do not run JavaScript.
 */
export function metadataForPath(pathname: string): PageMetadata {
  const path = canonicalPathFor(pathname);

  if (path === "/") {
    return {
      title: "iDeveloper Academy | أكاديمية البرمجة والروبوتات للأطفال",
      description: DEFAULT_DESCRIPTION,
      canonicalPath: "/",
    };
  }

  if (path === "/courses") {
    return {
      title: "الكورسات | iDeveloper Academy",
      description:
        "كورسات Scratch وRobotics وWeb وPython للأطفال من 6 إلى 17 سنة في أكاديمية iDeveloper ببنها.",
      canonicalPath: path,
    };
  }

  if (path === "/register") {
    return {
      title: "التسجيل | iDeveloper Academy",
      description:
        "سجّل طفلك في كورسات البرمجة والروبوتات في أكاديمية iDeveloper ببنها.",
      canonicalPath: path,
    };
  }

  if (path === "/terms") {
    return {
      title: "الشروط والأحكام | iDeveloper Academy",
      description: "الشروط والأحكام الخاصة بأكاديمية iDeveloper.",
      canonicalPath: path,
    };
  }

  if (path === "/privacy") {
    return {
      title: "سياسة الخصوصية | iDeveloper Academy",
      description: "سياسة الخصوصية وحماية بيانات الطلاب في أكاديمية iDeveloper.",
      canonicalPath: path,
    };
  }

  if (path === "/login") {
    return {
      title: "Sign in | iDeveloper Academy",
      description: "Sign in to the iDeveloper Academy workspace.",
      canonicalPath: path,
    };
  }

  if (path === "/student") {
    return {
      title: "بوابة الطالب | iDeveloper Academy",
      description:
        "دخول الطلاب إلى الكورسات والمنهج ومتابعة التقدم في أكاديمية iDeveloper.",
      canonicalPath: path,
    };
  }

  if (path === "/admin") {
    return {
      title: "Admin workspace | iDeveloper Academy",
      description: "iDeveloper Academy admin workspace.",
      canonicalPath: path,
    };
  }

  if (path === "/leads") {
    return {
      title: "العملاء المحتملون | iDeveloper Academy",
      description:
        "لوحة متابعة العملاء المحتملين وإدارة التسجيلات في أكاديمية iDeveloper.",
      canonicalPath: path,
    };
  }

  if (path === "/instructor" || path.startsWith("/instructor/")) {
    return {
      title: "بوابة المدرّب | iDeveloper Academy",
      description: "بوابة المدرّب لمتابعة المجموعات والطلاب والتقييمات.",
      canonicalPath: path,
    };
  }

  if (path === "/404") return NOT_FOUND_METADATA;

  return {
    ...NOT_FOUND_METADATA,
    canonicalPath: path,
  };
}

/**
 * Applies metadata directly to the document head. We update the existing
 * static title/canonical/description nodes rather than adding duplicates, so
 * crawlers and browser tabs always see one authoritative value.
 */
export function applyPageMetadata(metadata: PageMetadata): void {
  document.title = metadata.title;

  let canonical = document.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = `${SITE_ORIGIN}${metadata.canonicalPath}`;

  let description = document.querySelector<HTMLMetaElement>(
    'meta[name="description"]',
  );
  if (!description) {
    description = document.createElement("meta");
    description.name = "description";
    document.head.appendChild(description);
  }
  description.content = metadata.description;
}
