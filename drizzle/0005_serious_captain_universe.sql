CREATE TABLE `admin_invites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`invitedBy` varchar(320),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_invites_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_invites_email_unique` UNIQUE(`email`)
);
