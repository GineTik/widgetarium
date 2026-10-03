import { z } from "widgetarium";
import type { Row } from "widgetarium";

export const JobSchema = z.object({
	widget: z.string(),
	state: z.enum(["fetching", "writing", "failed"]),
	done: z.number(),
	total: z.number(),
	failure: z.string().nullable(),
});

export const EntrySchema = z.object({
	id: z.string(),
	scope: z.string(),
	name: z.string(),
	title: z.string(),
	description: z.string(),
	tags: z.array(z.string()),
	installed: z.boolean(),
	action: z.enum(["add", "install", "update"]),
	update: z.object({ here: z.string(), there: z.string() }).nullable(),
	job: JobSchema.nullable(),
	lacks: z.string().nullable(),
});

export const SaidSchema = z.object({
	title: z.string(),
	lead: z.string(),
	mode: z.string(),
	isAsking: z.boolean(),
});

export type Entry = Row<z.infer<typeof EntrySchema>>;

export type Job = z.infer<typeof JobSchema>;

export type EntryState = Entry["action"] | "failed";
