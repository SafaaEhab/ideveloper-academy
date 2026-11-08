import { trpc } from "@/lib/trpc";
import { COOKIE_NAME, UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { API_BASE_URL, startLogin } from "./const";
import "./index.css";

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  startLogin();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${API_BASE_URL}/api/trpc`,
      transformer: superjson,
      headers() {
        // Preview auto-login fallback: when the browser blocks iframe cookies
        // (Safari ITP / private browsing / WebView), the runtime mirrors the
        // session into sessionStorage so we can forward it as a Bearer token.
        // The regular OAuth cookie flow keeps working and takes priority server-side.
        try {
          const raw = sessionStorage.getItem("manus-cookie");
          if (raw) {
            const prefix = `${COOKIE_NAME}=`;
            const pair = raw.split(";").find(s => s.trim().startsWith(prefix));
            const token = pair?.trim().slice(prefix.length);
            if (token) {
              return { Authorization: `Bearer ${token}` };
            }
          }
        } catch {
          // sessionStorage unavailable
        }
        return {};
      },
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);

// Keep the static first-paint shell until both React and the full app CSS are
// ready. The shell is fixed positioned, so fading it cannot shift layout; the
// 8s fallback in index.html covers a failed bundle or stylesheet.
const boot = document.getElementById("boot");
if (boot) {
  const reveal = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const root = document.getElementById("root");
        if (root) root.style.visibility = "visible";
        boot.style.opacity = "0";
        // Keep the fixed node mounted but invisible. Removing it is one less
        // DOM mutation during the layout-sensitive first seconds.
        window.setTimeout(() => {
          boot.style.visibility = "hidden";
        }, 220);
      });
    });
  };

  const waitForAssets = () => {
    const cssReady =
      (window as unknown as { __appCssReady?: boolean }).__appCssReady === true;
    if (!cssReady) {
      window.setTimeout(waitForAssets, 60);
      return;
    }
    const fonts = document.fonts?.ready ?? Promise.resolve();
    const timeout = new Promise<void>(resolve => window.setTimeout(resolve, 900));
    Promise.race([fonts, timeout]).then(reveal);
  };

  waitForAssets();
}
