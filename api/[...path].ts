/**
 * Vercel serverless entry.
 *
 * `api/[...path].ts` is a catch-all, so every route under `/api`
 * (`/api/trpc/*`, `/api/auth/login`, `/api/oauth/callback`, …) reaches the same
 * Express app that `pnpm start` runs on Render/Docker.
 *
 * The app itself is a pre-bundled single file (see `server/_core/vercel.ts` and
 * the `build:vercel` script) because Vercel's ESM builder leaves relative
 * imports unbundled and Node cannot resolve them without a file extension.
 *
 * The static client is served from `dist/public` by the Vercel CDN — see the
 * SPA fallback route in vercel.json.
 */
import app from "../dist/serverless-app.js";

export default app;