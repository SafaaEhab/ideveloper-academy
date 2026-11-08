CREATE TABLE `academy_instructors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(40),
	`title` varchar(120),
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `academy_instructors_id` PRIMARY KEY(`id`),
	CONSTRAINT `academy_instructors_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `academy_student_evaluations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`sessionId` int NOT NULL,
	`dateKey` varchar(10) NOT NULL,
	`attendance` enum('present','absent'),
	`homework` enum('completed','not_completed'),
	`focus` int,
	`participation` int,
	`notes` varchar(500),
	`recordedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `academy_student_evaluations_id` PRIMARY KEY(`id`),
	CONSTRAINT `evaluation_per_occurrence` UNIQUE(`studentId`,`sessionId`,`dateKey`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','instructor') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `academy_group_sessions` ADD `instructorId` int;