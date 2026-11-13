-- Phase 2 rollback (ONLY with owner approval and a fresh backup).
--
-- This removes Phase 2 tables and columns. It does NOT restore Phase 1 data
-- because Phase 2 is additive and Phase 1 tables were not modified except for
-- nullable/defaulted columns. Running this destroys Phase 2 messaging,
-- subscription, payment, reminder, expense and audit history.
--
-- Always take and verify a backup first (scripts/backup-phase2.mjs).
-- Prefer rolling back the application first, then restoring the pre-Phase-2
-- backup, rather than dropping tables from a live database.

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `academy_whatsapp_webhook_events`;
DROP TABLE IF EXISTS `academy_campaign_recipients`;
DROP TABLE IF EXISTS `academy_campaigns`;
DROP TABLE IF EXISTS `academy_message_templates`;
DROP TABLE IF EXISTS `academy_messaging_opt_outs`;
DROP TABLE IF EXISTS `academy_payment_reminders`;
DROP TABLE IF EXISTS `academy_payments`;
DROP TABLE IF EXISTS `academy_subscriptions`;
DROP TABLE IF EXISTS `academy_expenses`;
DROP TABLE IF EXISTS `academy_course_plans`;
DROP TABLE IF EXISTS `academy_audit_logs`;
DROP TABLE IF EXISTS `academy_settings`;
DROP TABLE IF EXISTS `academy_counters`;

ALTER TABLE `academy_lead_staff`
  DROP COLUMN `canMessaging`,
  DROP COLUMN `canRecordPayments`,
  DROP COLUMN `canManageSubscriptions`,
  DROP COLUMN `canViewReports`,
  DROP COLUMN `canManageExpenses`,
  DROP COLUMN `canViewSalaries`,
  DROP COLUMN `canManageFinanceSettings`;

ALTER TABLE `academy_leads`
  DROP COLUMN `whatsAppConsent`,
  DROP COLUMN `whatsAppConsentAt`,
  DROP COLUMN `whatsAppConsentSource`,
  DROP COLUMN `whatsAppOptOutAt`,
  DROP COLUMN `whatsAppOptOutByUserId`;

ALTER TABLE `academy_students`
  DROP COLUMN `whatsAppConsent`,
  DROP COLUMN `whatsAppConsentAt`,
  DROP COLUMN `whatsAppConsentSource`,
  DROP COLUMN `whatsAppOptOut`,
  DROP COLUMN `whatsAppOptOutAt`,
  DROP COLUMN `whatsAppOptOutByUserId`;

SET FOREIGN_KEY_CHECKS = 1;
