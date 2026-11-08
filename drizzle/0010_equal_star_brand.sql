CREATE TABLE `academy_assignment_files` (
	`id` int AUTO_INCREMENT NOT NULL,
	`submissionId` int NOT NULL,
	`storageKey` varchar(80) NOT NULL,
	`originalName` varchar(255) NOT NULL,
	`mimeType` varchar(120) NOT NULL,
	`size` int NOT NULL,
	`dataBase64` longtext NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `academy_assignment_files_id` PRIMARY KEY(`id`),
	CONSTRAINT `academy_assignment_files_storageKey_unique` UNIQUE(`storageKey`)
);
--> statement-breakpoint
CREATE TABLE `academy_assignment_submissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assignmentId` int NOT NULL,
	`studentId` int NOT NULL,
	`textResponse` text,
	`codeResponse` text,
	`status` enum('submitted','graded') NOT NULL DEFAULT 'submitted',
	`late` boolean NOT NULL DEFAULT false,
	`grade` int,
	`feedback` text,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	`gradedBy` int,
	`gradedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `academy_assignment_submissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `submission_per_student` UNIQUE(`assignmentId`,`studentId`)
);
--> statement-breakpoint
CREATE TABLE `academy_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`course` enum('Scratch','Robotics','Web','Python') NOT NULL,
	`sessionId` int,
	`title` varchar(200) NOT NULL,
	`instructions` text NOT NULL,
	`dueAt` timestamp,
	`maxGrade` int NOT NULL DEFAULT 100,
	`active` boolean NOT NULL DEFAULT true,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `academy_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `academy_course_offerings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`course` enum('Scratch','Robotics','Web','Python') NOT NULL,
	`status` enum('live','coming_soon','waiting_list') NOT NULL DEFAULT 'coming_soon',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `academy_course_offerings_id` PRIMARY KEY(`id`),
	CONSTRAINT `academy_course_offerings_course_unique` UNIQUE(`course`)
);
--> statement-breakpoint
CREATE TABLE `academy_course_waiting_list` (
	`id` int AUTO_INCREMENT NOT NULL,
	`course` enum('Scratch','Robotics','Web','Python') NOT NULL,
	`name` varchar(160) NOT NULL,
	`phone` varchar(40) NOT NULL,
	`email` varchar(320),
	`note` varchar(500),
	`status` enum('pending','contacted','enrolled') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `academy_course_waiting_list_id` PRIMARY KEY(`id`),
	CONSTRAINT `waiting_list_course_phone` UNIQUE(`course`,`phone`)
);
--> statement-breakpoint
CREATE TABLE `academy_quiz_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`course` enum('Scratch','Robotics','Web','Python') NOT NULL,
	`lessonId` varchar(64) NOT NULL,
	`score` int NOT NULL,
	`total` int NOT NULL,
	`answers` text,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `academy_quiz_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `academy_registration_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestKey` varchar(64) NOT NULL,
	`fullName` varchar(160) NOT NULL,
	`phone` varchar(40) NOT NULL,
	`age` int NOT NULL,
	`address` varchar(500) NOT NULL,
	`school` varchar(200) NOT NULL,
	`parentEmail` varchar(320) NOT NULL,
	`parentPhone` varchar(40) NOT NULL,
	`course` enum('Scratch','Robotics','Web','Python') NOT NULL,
	`gender` varchar(16) NOT NULL,
	`siblingRegistered` boolean NOT NULL DEFAULT false,
	`siblingName` varchar(160),
	`siblingPhone` varchar(40),
	`notes` varchar(2000),
	`status` enum('pending','contacted','approved','rejected') NOT NULL DEFAULT 'pending',
	`studentId` int,
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `academy_registration_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `academy_registration_requests_requestKey_unique` UNIQUE(`requestKey`)
);
--> statement-breakpoint
CREATE INDEX `assignment_file_submission` ON `academy_assignment_files` (`submissionId`);--> statement-breakpoint
CREATE INDEX `submission_student` ON `academy_assignment_submissions` (`studentId`);--> statement-breakpoint
CREATE INDEX `assignment_group_course` ON `academy_assignments` (`groupId`,`course`);--> statement-breakpoint
CREATE INDEX `waiting_list_status` ON `academy_course_waiting_list` (`status`);--> statement-breakpoint
CREATE INDEX `quiz_attempt_student_lesson` ON `academy_quiz_attempts` (`studentId`,`course`,`lessonId`);--> statement-breakpoint
CREATE INDEX `registration_status` ON `academy_registration_requests` (`status`);--> statement-breakpoint
INSERT IGNORE INTO `academy_course_offerings` (`course`, `status`, `updatedAt`) VALUES
	('Scratch', 'coming_soon', NOW()),
	('Robotics', 'coming_soon', NOW()),
	('Web', 'coming_soon', NOW()),
	('Python', 'live', NOW());