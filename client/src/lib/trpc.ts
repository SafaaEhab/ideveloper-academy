import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../server/routers";

export const trpc = createTRPCReact<AppRouter>();

/**
 * How often the admin workspace and the student portal re-pull their data.
 *
 * Students, groups, schedules and announcements live in a shared database, but
 * nothing pushes updates to an open tab. Without this, two people looking at the
 * academy at the same time only agree on the data each of them happened to
 * fetch when the page loaded. Polling keeps the screens in step while leaving
 * `auth.me` alone — that one runs on every visitor and would otherwise turn a
 * background tab into a session check every 30 seconds.
 */
export const LIVE_REFETCH_INTERVAL = 30_000;
