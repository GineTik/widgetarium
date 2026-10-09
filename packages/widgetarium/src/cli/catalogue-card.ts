import { z } from "zod";

const SourceCardSchema = z.looseObject({ implementation: z.string() });

const PropCardSchema = z.looseObject({
	kind: z.string().optional(),
	control: z.string().optional(),
	type: z.string().optional(),
	label: z.string().optional(),
	writes: z.array(z.string()).default([]),
	source: SourceCardSchema.optional(),
	describes: z.record(z.string(), z.unknown()).optional(),
});

const CommandCardSchema = z.looseObject({
	label: z.string().optional(),
	source: SourceCardSchema.optional(),
});

export const WidgetCardSchema = z.looseObject({
	title: z.string().optional(),
	description: z.string().default(""),
	keywords: z.array(z.string()).default([]),
	role: z.string().optional(),
	props: z.record(z.string(), PropCardSchema).default({}),
	commands: z.record(z.string(), CommandCardSchema).default({}),
	slots: z.record(z.string(), z.unknown()).default({}),
	files: z.array(z.string()).default([]),
	dependencies: z.record(z.string(), z.string()).default({}),
	widgetDependencies: z.array(z.string()).default([]),
});

export type WidgetCard = z.output<typeof WidgetCardSchema>;
export type PropCard = z.output<typeof PropCardSchema>;
export type CommandCard = z.output<typeof CommandCardSchema>;
