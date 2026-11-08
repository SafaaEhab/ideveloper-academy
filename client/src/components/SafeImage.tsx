import { useEffect, useState, type ImgHTMLAttributes } from "react";
import { API_BASE_URL } from "@/const";

export const ACHIEVEMENT_PLACEHOLDER = "/images/achievement-placeholder.svg";

type SafeImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "onError"> & {
  src?: string | null;
  fallbackSrc?: string;
};

/**
 * An <img> that never leaves the browser's broken-image icon in place.
 *
 * A failed network request, a removed Cloudinary asset or a stale pasted link
 * all swap to the local placeholder; the alt text still describes the card.
 */
export default function SafeImage({
  src,
  fallbackSrc = ACHIEVEMENT_PLACEHOLDER,
  alt = "",
  ...props
}: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  // Locally uploaded achievement photos live on the API host (MonsterASP).
  // The database stores a relative /api/uploads/... path; resolve it against
  // API_BASE_URL so the Vercel frontend does not look for it on its own origin.
  const resolvedSrc =
    src?.startsWith("/api/uploads/") ? `${API_BASE_URL}${src}` : src;

  return (
    <img
      {...props}
      src={failed || !resolvedSrc ? fallbackSrc : resolvedSrc}
      alt={alt}
      onError={() => setFailed(true)}
    />
  );
}
