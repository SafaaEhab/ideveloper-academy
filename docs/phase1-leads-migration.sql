-- Phase 1 leads migration for the production MySQL database.
-- Apply with the existing Drizzle pipeline:
--   $env:DATABASE_URL="mysql://.../db"; pnpm db:push
-- Or paste this file into MonsterASP -> WebSQL.
-- It is additive: five new tables plus a one-time backfill from the legacy
-- registration-request table. Take a database backup first.
CREATE TABLE `academy_lead_activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`type` enum('created','status_changed','note_added','contact_logged','follow_up_set','employee_assigned','converted','duplicate_attempt','sheet_sync_failed','sheet_sync_succeeded','updated') NOT NULL,
	`previousStatus` enum('new','needs_follow_up','subscribed','not_interested'),
	`newStatus` enum('new','needs_follow_up','subscribed','not_interested'),
	`employeeId` int,
	`note` text,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `academy_lead_activities_id` PRIMARY KEY(`id`)
);

CREATE TABLE `academy_lead_dedupe_locks` (
	`dedupeKey` varchar(64) NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `academy_lead_dedupe_locks_dedupeKey` PRIMARY KEY(`dedupeKey`)
);

CREATE TABLE `academy_lead_staff` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`displayName` varchar(160) NOT NULL,
	`email` varchar(320) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`canConvert` boolean NOT NULL DEFAULT false,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `academy_lead_staff_id` PRIMARY KEY(`id`),
	CONSTRAINT `academy_lead_staff_userId_unique` UNIQUE(`userId`),
	CONSTRAINT `academy_lead_staff_email_unique` UNIQUE(`email`)
);

CREATE TABLE `academy_lead_sync_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`status` enum('pending','processing','succeeded','failed') NOT NULL DEFAULT 'pending',
	`attempts` int NOT NULL DEFAULT 0,
	`nextAttemptAt` timestamp NOT NULL DEFAULT (now()),
	`lockedAt` timestamp,
	`lastError` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `academy_lead_sync_jobs_id` PRIMARY KEY(`id`),
	CONSTRAINT `academy_lead_sync_jobs_leadId_unique` UNIQUE(`leadId`)
);

CREATE TABLE `academy_leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`legacyRegistrationId` int,
	`fullName` varchar(160) NOT NULL,
	`studentPhone` varchar(20) NOT NULL,
	`age` int NOT NULL,
	`school` varchar(200) NOT NULL,
	`address` varchar(500) NOT NULL,
	`parentEmail` varchar(320) NOT NULL,
	`parentPhone` varchar(20) NOT NULL,
	`course` enum('Scratch','Robotics','Web','Python') NOT NULL,
	`gender` varchar(16) NOT NULL,
	`hasRegisteredSibling` boolean NOT NULL DEFAULT false,
	`siblingName` varchar(160),
	`siblingPhone` varchar(20),
	`customerNotes` text,
	`status` enum('new','needs_follow_up','subscribed','not_interested') NOT NULL DEFAULT 'new',
	`assignedEmployeeId` int,
	`registrationDate` timestamp NOT NULL DEFAULT (now()),
	`lastContactDate` timestamp,
	`nextFollowUpDate` timestamp,
	`internalNotes` text,
	`source` varchar(32) NOT NULL DEFAULT 'website',
	`whatsAppOptOut` boolean NOT NULL DEFAULT false,
	`googleSheetSyncStatus` enum('pending','synced','failed') NOT NULL DEFAULT 'pending',
	`googleSheetLastSyncAt` timestamp,
	`googleSheetRowNumber` int,
	`googleSheetSyncAttempts` int NOT NULL DEFAULT 0,
	`googleSheetSyncError` varchar(1000),
	`googleSheetSyncedRevision` int NOT NULL DEFAULT 0,
	`syncRevision` int NOT NULL DEFAULT 1,
	`convertedStudentId` int,
	`convertedAt` timestamp,
	`duplicateAttempts` int NOT NULL DEFAULT 0,
	`lastDuplicateAt` timestamp,
	`notInterestedReason` varchar(32),
	`notInterestedNote` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `academy_leads_id` PRIMARY KEY(`id`),
	CONSTRAINT `academy_leads_legacyRegistrationId_unique` UNIQUE(`legacyRegistrationId`)
);

CREATE INDEX `lead_activity_lead` ON `academy_lead_activities` (`leadId`,`createdAt`);
CREATE INDEX `lead_activity_employee` ON `academy_lead_activities` (`employeeId`);
CREATE INDEX `lead_staff_active` ON `academy_lead_staff` (`active`);
CREATE INDEX `lead_sync_due` ON `academy_lead_sync_jobs` (`status`,`nextAttemptAt`);
CREATE INDEX `lead_phone` ON `academy_leads` (`studentPhone`);
CREATE INDEX `lead_course` ON `academy_leads` (`course`);
CREATE INDEX `lead_status` ON `academy_leads` (`status`);
CREATE INDEX `lead_assigned_employee` ON `academy_leads` (`assignedEmployeeId`);
CREATE INDEX `lead_registration_date` ON `academy_leads` (`registrationDate`);
CREATE INDEX `lead_follow_up` ON `academy_leads` (`nextFollowUpDate`);
CREATE INDEX `lead_sheet_sync` ON `academy_leads` (`googleSheetSyncStatus`,`syncRevision`);
CREATE INDEX `lead_converted_student` ON `academy_leads` (`convertedStudentId`);

-- Preserve any existing registration requests by moving them into the lead
-- pipeline. The unique legacy id makes this backfill safe if it is ever rerun.
INSERT INTO `academy_leads` (
	`legacyRegistrationId`, `fullName`, `studentPhone`, `age`, `school`, `address`,
	`parentEmail`, `parentPhone`, `course`, `gender`, `hasRegisteredSibling`,
	`siblingName`, `siblingPhone`, `customerNotes`, `status`, `registrationDate`,
	`lastContactDate`, `internalNotes`, `source`, `whatsAppOptOut`,
	`googleSheetSyncStatus`, `syncRevision`, `convertedStudentId`, `convertedAt`,
	`notInterestedReason`, `notInterestedNote`, `createdAt`, `updatedAt`
)
SELECT
	r.`id`, r.`fullName`, r.`phone`, r.`age`, r.`school`, r.`address`,
	r.`parentEmail`, r.`parentPhone`, r.`course`, r.`gender`, r.`siblingRegistered`,
	r.`siblingName`, r.`siblingPhone`, r.`notes`,
	CASE r.`status`
		WHEN 'contacted' THEN 'needs_follow_up'
		WHEN 'approved' THEN 'subscribed'
		WHEN 'rejected' THEN 'not_interested'
		ELSE 'new'
	END,
	r.`createdAt`, r.`reviewedAt`,
	'ØªÙ… Ø§Ø³ØªÙŠØ±Ø§Ø¯ Ù‡Ø°Ø§ Ø§Ù„Ø³Ø¬Ù„ Ù…Ù† Ø·Ù„Ø¨Ø§Øª Ø§Ù„ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ù‚Ø¯ÙŠÙ…Ø© Ø£Ø«Ù†Ø§Ø¡ ØªØ±Ù‚ÙŠØ© Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡ Ø§Ù„Ù…Ø­ØªÙ…Ù„ÙŠÙ†.',
	'legacy', 0, 'pending', 1, r.`studentId`, r.`reviewedAt`,
	CASE WHEN r.`status` = 'rejected' THEN 'other' ELSE NULL END,
	CASE WHEN r.`status` = 'rejected' THEN 'Ø³Ø¨Ø¨ Ù‚Ø¯ÙŠÙ… ØºÙŠØ± Ù…Ø³Ø¬Ù„' ELSE NULL END,
	r.`createdAt`, r.`updatedAt`
FROM `academy_registration_requests` r
WHERE NOT EXISTS (
	SELECT 1 FROM `academy_leads` l WHERE l.`legacyRegistrationId` = r.`id`
);
