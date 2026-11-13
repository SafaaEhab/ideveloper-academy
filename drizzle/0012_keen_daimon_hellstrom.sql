CREATE TABLE `academy_counters` (
	`key` varchar(64) NOT NULL,
	`value` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `academy_counters_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `academy_settings` (
	`key` varchar(120) NOT NULL,
	`value` text NOT NULL,
	`updatedByUserId` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `academy_settings_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `academy_audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorUserId` int,
	`action` varchar(120) NOT NULL,
	`entityType` varchar(64) NOT NULL,
	`entityId` int,
	`metadata` text,
	`ipAddress` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `academy_audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `academy_campaign_recipients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`recipientType` enum('lead','student') NOT NULL,
	`recipientId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`phone` varchar(20) NOT NULL,
	`status` enum('queued','excluded','sending','sent','delivered','read','failed','cancelled') NOT NULL DEFAULT 'queued',
	`exclusionReason` varchar(80),
	`messageBody` text,
	`variablesJson` text,
	`providerMessageId` varchar(120),
	`error` varchar(1000),
	`attempts` int NOT NULL DEFAULT 0,
	`retryCount` int NOT NULL DEFAULT 0,
	`senderUserId` int,
	`nextAttemptAt` timestamp,
	`lastAttemptAt` timestamp,
	`queuedAt` timestamp,
	`sentAt` timestamp,
	`deliveredAt` timestamp,
	`readAt` timestamp,
	`failedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `academy_campaign_recipients_id` PRIMARY KEY(`id`),
	CONSTRAINT `campaign_recipient_unique` UNIQUE(`campaignId`,`recipientType`,`recipientId`)
);
--> statement-breakpoint
CREATE TABLE `academy_campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`audience` enum('leads','students','mixed') NOT NULL,
	`messageType` enum('marketing','transactional') NOT NULL DEFAULT 'marketing',
	`templateId` int,
	`body` text NOT NULL,
	`status` enum('draft','scheduled','queued','sending','completed','cancelled','failed') NOT NULL DEFAULT 'draft',
	`scheduledAt` timestamp,
	`timezone` varchar(64) NOT NULL DEFAULT 'Africa/Cairo',
	`batchSize` int NOT NULL DEFAULT 25,
	`delayMs` int NOT NULL DEFAULT 1000,
	`createdByUserId` int,
	`filtersJson` text,
	`totalRecipients` int NOT NULL DEFAULT 0,
	`sentCount` int NOT NULL DEFAULT 0,
	`failedCount` int NOT NULL DEFAULT 0,
	`excludedCount` int NOT NULL DEFAULT 0,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`cancelledAt` timestamp,
	`cancelledByUserId` int,
	`lastError` varchar(1000),
	`lockedAt` timestamp,
	`lockOwner` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `academy_campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `academy_course_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`course` enum('Scratch','Robotics','Web','Python') NOT NULL,
	`basePriceMinor` int,
	`currency` varchar(8) NOT NULL DEFAULT 'EGP',
	`defaultSubscriptionType` enum('monthly','two_months','one_time') NOT NULL DEFAULT 'monthly',
	`active` boolean NOT NULL DEFAULT true,
	`updatedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `academy_course_plans_id` PRIMARY KEY(`id`),
	CONSTRAINT `academy_course_plans_course_unique` UNIQUE(`course`)
);
--> statement-breakpoint
CREATE TABLE `academy_expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`amountMinor` int NOT NULL,
	`category` enum('rent','trainer_salaries','equipment','other') NOT NULL,
	`expenseDateKey` varchar(10) NOT NULL,
	`description` varchar(1000) NOT NULL,
	`recordedByUserId` int,
	`attachmentDataBase64` longtext,
	`attachmentMime` varchar(120),
	`attachmentName` varchar(255),
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `academy_expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `academy_message_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`category` enum('welcome','class_reminder','payment_reminder','lead_follow_up','custom') NOT NULL,
	`body` text NOT NULL,
	`variables` text,
	`metaTemplateName` varchar(120),
	`language` varchar(10) NOT NULL DEFAULT 'ar',
	`metaCategory` enum('marketing','utility','authentication'),
	`metaStatus` enum('draft','pending','approved','rejected','disabled') NOT NULL DEFAULT 'draft',
	`metaStatusCheckedAt` timestamp,
	`active` boolean NOT NULL DEFAULT true,
	`createdByUserId` int,
	`updatedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `academy_message_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `template_name_language` UNIQUE(`name`,`language`)
);
--> statement-breakpoint
CREATE TABLE `academy_messaging_opt_outs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recipientType` enum('lead','student') NOT NULL,
	`recipientId` int NOT NULL,
	`optedOut` boolean NOT NULL,
	`reason` varchar(500),
	`changedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `academy_messaging_opt_outs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `academy_payment_reminders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subscriptionId` int NOT NULL,
	`paymentId` int,
	`kind` enum('before_due_3','due','overdue_2','overdue_7','manual','thank_you') NOT NULL,
	`dueDateKey` varchar(10) NOT NULL,
	`scheduledFor` timestamp NOT NULL,
	`status` enum('pending','sending','sent','failed','cancelled','skipped') NOT NULL DEFAULT 'pending',
	`attempts` int NOT NULL DEFAULT 0,
	`providerMessageId` varchar(120),
	`error` varchar(1000),
	`messageBody` text,
	`templateName` varchar(120),
	`templateLanguage` varchar(10),
	`cancellationReason` varchar(500),
	`sentAt` timestamp,
	`lastAttemptAt` timestamp,
	`cancelledAt` timestamp,
	`createdByUserId` int,
	`dedupeKey` varchar(160) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `academy_payment_reminders_id` PRIMARY KEY(`id`),
	CONSTRAINT `academy_payment_reminders_dedupeKey_unique` UNIQUE(`dedupeKey`)
);
--> statement-breakpoint
CREATE TABLE `academy_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`receiptSequence` int NOT NULL,
	`receiptNumber` varchar(40) NOT NULL,
	`subscriptionId` int NOT NULL,
	`studentId` int NOT NULL,
	`type` enum('payment','reversal') NOT NULL DEFAULT 'payment',
	`amountMinor` int NOT NULL,
	`method` enum('bank_transfer','instapay','cash','wallet') NOT NULL,
	`paymentDate` timestamp NOT NULL,
	`recordedByUserId` int,
	`transactionReference` varchar(80) NOT NULL,
	`reversesPaymentId` int,
	`reversalReason` varchar(500),
	`status` enum('posted','reversed') NOT NULL DEFAULT 'posted',
	`receiptImageDataBase64` longtext,
	`receiptImageMime` varchar(120),
	`receiptImageName` varchar(255),
	`notes` varchar(1000),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `academy_payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `academy_payments_receiptSequence_unique` UNIQUE(`receiptSequence`),
	CONSTRAINT `academy_payments_receiptNumber_unique` UNIQUE(`receiptNumber`),
	CONSTRAINT `academy_payments_transactionReference_unique` UNIQUE(`transactionReference`),
	CONSTRAINT `academy_payments_reversesPaymentId_unique` UNIQUE(`reversesPaymentId`)
);
--> statement-breakpoint
CREATE TABLE `academy_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`course` enum('Scratch','Robotics','Web','Python') NOT NULL,
	`type` enum('monthly','two_months','one_time') NOT NULL,
	`baseAmountMinor` int NOT NULL,
	`siblingStudentId` int,
	`siblingDiscountPercent` int NOT NULL DEFAULT 0,
	`siblingDiscountMinor` int NOT NULL DEFAULT 0,
	`manualDiscountMinor` int NOT NULL DEFAULT 0,
	`discountReason` varchar(500),
	`finalAmountMinor` int NOT NULL,
	`paymentMethod` enum('bank_transfer','instapay','cash','wallet') NOT NULL,
	`dueDateKey` varchar(10) NOT NULL,
	`recurringDueDay` int,
	`startDateKey` varchar(10) NOT NULL,
	`endDateKey` varchar(10),
	`status` enum('active','completed','cancelled') NOT NULL DEFAULT 'active',
	`reminderEnabled` boolean NOT NULL DEFAULT true,
	`notes` varchar(1000),
	`createdByUserId` int,
	`cancelledAt` timestamp,
	`cancelledByUserId` int,
	`cancelReason` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `academy_subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `academy_whatsapp_webhook_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventKey` varchar(128) NOT NULL,
	`eventType` varchar(64) NOT NULL,
	`payload` longtext NOT NULL,
	`status` enum('received','processed','ignored','failed') NOT NULL DEFAULT 'received',
	`error` varchar(1000),
	`receivedAt` timestamp NOT NULL DEFAULT (now()),
	`processedAt` timestamp,
	CONSTRAINT `academy_whatsapp_webhook_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `academy_whatsapp_webhook_events_eventKey_unique` UNIQUE(`eventKey`)
);
--> statement-breakpoint
ALTER TABLE `academy_lead_staff` ADD `canMessaging` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `academy_lead_staff` ADD `canRecordPayments` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `academy_lead_staff` ADD `canManageSubscriptions` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `academy_lead_staff` ADD `canViewReports` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `academy_lead_staff` ADD `canManageExpenses` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `academy_lead_staff` ADD `canViewSalaries` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `academy_lead_staff` ADD `canManageFinanceSettings` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `academy_leads` ADD `whatsAppConsent` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `academy_leads` ADD `whatsAppConsentAt` timestamp;--> statement-breakpoint
ALTER TABLE `academy_leads` ADD `whatsAppConsentSource` varchar(120);--> statement-breakpoint
ALTER TABLE `academy_leads` ADD `whatsAppOptOutAt` timestamp;--> statement-breakpoint
ALTER TABLE `academy_leads` ADD `whatsAppOptOutByUserId` int;--> statement-breakpoint
ALTER TABLE `academy_students` ADD `whatsAppConsent` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `academy_students` ADD `whatsAppConsentAt` timestamp;--> statement-breakpoint
ALTER TABLE `academy_students` ADD `whatsAppConsentSource` varchar(120);--> statement-breakpoint
ALTER TABLE `academy_students` ADD `whatsAppOptOut` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `academy_students` ADD `whatsAppOptOutAt` timestamp;--> statement-breakpoint
ALTER TABLE `academy_students` ADD `whatsAppOptOutByUserId` int;--> statement-breakpoint
CREATE INDEX `audit_entity` ON `academy_audit_logs` (`entityType`,`entityId`);--> statement-breakpoint
CREATE INDEX `audit_action` ON `academy_audit_logs` (`action`);--> statement-breakpoint
CREATE INDEX `audit_created` ON `academy_audit_logs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `campaign_recipient_status` ON `academy_campaign_recipients` (`campaignId`,`status`);--> statement-breakpoint
CREATE INDEX `campaign_recipient_provider` ON `academy_campaign_recipients` (`providerMessageId`);--> statement-breakpoint
CREATE INDEX `campaign_recipient_next` ON `academy_campaign_recipients` (`status`,`nextAttemptAt`);--> statement-breakpoint
CREATE INDEX `campaign_status_schedule` ON `academy_campaigns` (`status`,`scheduledAt`);--> statement-breakpoint
CREATE INDEX `campaign_created_by` ON `academy_campaigns` (`createdByUserId`);--> statement-breakpoint
CREATE INDEX `expense_date` ON `academy_expenses` (`expenseDateKey`);--> statement-breakpoint
CREATE INDEX `expense_category` ON `academy_expenses` (`category`);--> statement-breakpoint
CREATE INDEX `expense_recorder` ON `academy_expenses` (`recordedByUserId`);--> statement-breakpoint
CREATE INDEX `template_category` ON `academy_message_templates` (`category`);--> statement-breakpoint
CREATE INDEX `template_active` ON `academy_message_templates` (`active`);--> statement-breakpoint
CREATE INDEX `opt_out_recipient` ON `academy_messaging_opt_outs` (`recipientType`,`recipientId`);--> statement-breakpoint
CREATE INDEX `opt_out_created` ON `academy_messaging_opt_outs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `reminder_due` ON `academy_payment_reminders` (`status`,`scheduledFor`);--> statement-breakpoint
CREATE INDEX `reminder_subscription` ON `academy_payment_reminders` (`subscriptionId`,`status`);--> statement-breakpoint
CREATE INDEX `reminder_provider` ON `academy_payment_reminders` (`providerMessageId`);--> statement-breakpoint
CREATE INDEX `payment_subscription` ON `academy_payments` (`subscriptionId`);--> statement-breakpoint
CREATE INDEX `payment_student` ON `academy_payments` (`studentId`);--> statement-breakpoint
CREATE INDEX `payment_date` ON `academy_payments` (`paymentDate`);--> statement-breakpoint
CREATE INDEX `payment_recorded_by` ON `academy_payments` (`recordedByUserId`);--> statement-breakpoint
CREATE INDEX `payment_type_status` ON `academy_payments` (`type`,`status`);--> statement-breakpoint
CREATE INDEX `subscription_student` ON `academy_subscriptions` (`studentId`);--> statement-breakpoint
CREATE INDEX `subscription_status` ON `academy_subscriptions` (`status`);--> statement-breakpoint
CREATE INDEX `subscription_due` ON `academy_subscriptions` (`status`,`dueDateKey`);--> statement-breakpoint
CREATE INDEX `subscription_course` ON `academy_subscriptions` (`course`);--> statement-breakpoint
CREATE INDEX `webhook_status` ON `academy_whatsapp_webhook_events` (`status`,`receivedAt`);