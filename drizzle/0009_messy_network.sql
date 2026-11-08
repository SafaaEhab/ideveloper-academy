CREATE TABLE `curriculum_curricula` (
	`id` int AUTO_INCREMENT NOT NULL,
	`course` enum('Scratch','Robotics','Web','Python') NOT NULL,
	`displayName` varchar(120) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `curriculum_curricula_id` PRIMARY KEY(`id`),
	CONSTRAINT `curriculum_curricula_course_unique` UNIQUE(`course`)
);
--> statement-breakpoint
CREATE TABLE `curriculum_lessons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`curriculumId` int NOT NULL,
	`lessonId` varchar(64) NOT NULL,
	`number` int NOT NULL,
	`month` int NOT NULL,
	`phase` int NOT NULL,
	`kind` varchar(32) NOT NULL,
	`title` varchar(300) NOT NULL,
	`subtitle` varchar(300),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `curriculum_lessons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `student_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`curriculumId` int NOT NULL,
	`lessonId` varchar(64) NOT NULL,
	`status` enum('not_started','in_progress','completed') NOT NULL DEFAULT 'not_started',
	`completedAt` timestamp,
	`instructorNote` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `student_progress_id` PRIMARY KEY(`id`),
	CONSTRAINT `progress_unique` UNIQUE(`studentId`,`curriculumId`,`lessonId`)
);
