CREATE TABLE `discussion_histories` (
	`id` text PRIMARY KEY NOT NULL,
	`discussion_thread_id` text NOT NULL,
	`previous_status` text NOT NULL,
	`new_status` text NOT NULL,
	`performed_by` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`discussion_thread_id`) REFERENCES `discussions`(`thread_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "discussion_histories_previous_status_check" CHECK("discussion_histories"."previous_status" IN ('NEW', 'OPEN', 'DEFERRED', 'CLOSED')),
	CONSTRAINT "discussion_histories_new_status_check" CHECK("discussion_histories"."new_status" IN ('NEW', 'OPEN', 'DEFERRED', 'CLOSED')),
	CONSTRAINT "discussion_histories_transition_check" CHECK((
        ("discussion_histories"."previous_status" = 'NEW' AND "discussion_histories"."new_status" = 'OPEN')
        OR
        ("discussion_histories"."previous_status" = 'OPEN' AND "discussion_histories"."new_status" IN (
            'DEFERRED',
            'CLOSED'
        ))
        OR
        ("discussion_histories"."previous_status" = 'DEFERRED' AND "discussion_histories"."new_status" IN (
            'OPEN',
            'CLOSED'
        ))
    )),
	CONSTRAINT "discussion_histories_reason_length_check" CHECK(length(trim("discussion_histories"."reason")) BETWEEN 1 AND 1000)
);
