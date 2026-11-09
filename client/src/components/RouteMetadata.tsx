import { useEffect } from "react";
import { useLocation } from "wouter";
import { applyPageMetadata, metadataForPath } from "@/lib/pageMetadata";

/**
 * Applies route-specific `<title>`, canonical URL and description on every
 * client-side navigation. Rendering it once at the app root keeps the metadata
 * in sync even when a page component is lazy-loaded or reused across routes.
 */
export default function RouteMetadata() {
  const [location] = useLocation();
  const metadata = metadataForPath(location);

  useEffect(() => {
    applyPageMetadata(metadata);
  }, [metadata.canonicalPath, metadata.description, metadata.title]);

  return null;
}
