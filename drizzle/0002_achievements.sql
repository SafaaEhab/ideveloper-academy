CREATE TABLE `academy_achievements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(200),
	`description` text NOT NULL,
	`achievedOn` varchar(60),
	`imageUrl` text,
	`tag` varchar(60),
	`sortOrder` int DEFAULT 0 NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `academy_achievements_id` PRIMARY KEY(`id`)
);
