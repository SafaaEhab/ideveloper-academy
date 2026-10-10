CREATE TABLE `academy_announcements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`badge` varchar(120),
	`title` varchar(200) NOT NULL,
	`headline` varchar(200),
	`body` text,
	`ctaLabel` varchar(80),
	`ctaHint` varchar(200),
	`whatsappNumber` varchar(40),
	`deadline` timestamp,
	`enabled` tinyint(1) DEFAULT 0 NOT NULL,
	`facts` text,
	`prizes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `academy_announcements_id` PRIMARY KEY(`id`)
);