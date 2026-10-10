/**
 * Serverless entry point for Vercel (`api/[...path].ts` imports this).
 *
 * Vercel's Node builder does not bundle relative imports for ESM projects — it
 * emits `import ... from "../server/_core/app"` verbatim, and Node's ESM
 * resolver rejects the extensionless specifier. Bundling to a single file here
 * (see the `build:vercel` script) leaves only bare package imports, which
 * Node resolves from node_modules.
 */
import { createApp } from "./app";

const app = createApp();

export default app;