-- Phase 1 — Leads management rollback (MySQL)
--
-- WARNING: destructive. This removes the lead pipeline and every activity /
-- sync job row. Only run after taking a backup, and never on production without
-- an explicit decision to drop the Phase 1 data.
--
-- The old `academy_registration_requests` table is intentionally left untouched:
-- the 0011 migration only read from it during the one-time backfill.

DROP TABLE IF EXISTS `academy_lead_sync_jobs`;
DROP TABLE IF EXISTS `academy_lead_activities`;
DROP TABLE IF EXISTS `academy_lead_dedupe_locks`;
DROP TABLE IF EXISTS `academy_lead_staff`;
DROP TABLE IF EXISTS `academy_leads`;

-- The original registration rows remain in `academy_registration_requests`.
