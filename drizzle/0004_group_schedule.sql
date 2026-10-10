CREATE TABLE `academy_group_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`dayOfWeek` int NOT NULL,
	`startTime` varchar(5) NOT NULL,
	`endTime` varchar(5) NOT NULL,
	`location` varchar(120),
	`notes` varchar(200),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `academy_group_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `academy_session_exceptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`dateKey` varchar(10) NOT NULL,
	`kind` enum('cancelled','moved') NOT NULL,
	`moveToDate` varchar(10),
	`startTime` varchar(5),
	`endTime` varchar(5),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `academy_session_exceptions_id` PRIMARY KEY(`id`)
);