import { z } from "zod";
import { PropRefSchema } from "@widgetarium/core/engine/prop-ref.js";
import type { PlaceAt } from "@widgetarium/core/gateway/host.js";

export const InstallJobSchema = z.object({
	widget: z.string(),
	state: z.enum(["fetching", "writing", "failed"]),
	done: z.number(),
	total: z.number(),
	failure: z.string().nullable(),
});

const EntryActionSchema = z.enum(["add", "install", "update"]);

export const CatalogueEntrySchema = z.object({
	id: z.string(),
	scope: z.string(),
	name: z.string(),
	title: z.string(),
	description: z.string(),
	tags: z.array(z.string()),
	installed: z.boolean(),
	action: EntryActionSchema,
	update: z.object({ here: z.string(), there: z.string() }).nullable(),
	job: InstallJobSchema.nullable(),
	lacks: z.string().nullable(),
});

export const FacetSchema = z.object({
	name: z.string(),
	label: z.string(),
	count: z.number(),
	icon: z.string().optional(),
	mark: z.string().optional(),
	tone: z.string().optional(),
});

export const CountsSchema = z.object({
	all: z.number(),
	installed: z.number(),
	update: z.number(),
	shown: z.number(),
	narrowed: z.number(),
});

export const TemplateRowSchema = z.object({
	id: z.string(),
	title: z.string(),
	description: z.string(),
	widgets: z.array(z.string()),
	sketch: z.array(
		z.object({ name: z.string(), rows: z.array(z.array(z.object({ label: z.string(), grow: z.number() }))) }),
	),
});

export const DocPageRowSchema = z.object({ name: z.string(), label: z.string(), icon: z.string() });

export const DocPageSchema = z.object({
	id: z.string(),
	title: z.string(),
	body: z.string(),
	source: z.string(),
	action: z.object({ label: z.string(), icon: z.string(), href: z.string() }).nullable(),
	next: z.object({ id: z.string(), title: z.string() }).nullable(),
});

export const SaidSchema = z.object({
	title: z.string(),
	lead: z.string(),
	mode: z.string(),
	isAsking: z.boolean(),
});

const DropTargetSchema = z.union([
	z.object({ kind: z.literal("beside"), box: z.array(z.number()), at: z.number() }),
	z.object({
		kind: z.literal("wrap"),
		path: z.array(z.number()),
		axis: z.enum(["row", "column"]),
		side: z.enum(["before", "after"]),
	}),
]);

const PlaceAtSchema: z.ZodType<PlaceAt> = z.union([
	z.object({ kind: z.literal("board"), board: z.string(), target: DropTargetSchema }),
	z.object({ kind: z.literal("note"), note: z.string(), line: z.number() }),
]);

export const WidgetAskedSchema = z.object({ widget: z.string() });

export const PlaceAskedSchema = z.object({ widget: z.string(), at: PlaceAtSchema });

export const TemplateAskedSchema = z.object({ template: z.string() });

export const ClearAskedSchema = z.unknown();

export const ViewAskedSchema = z.object({ view: z.enum(["catalogue", "docs"]) });

const RefField = PropRefSchema.optional();

export const FiltersFieldsSchema = z.object({
	keyword: RefField.meta({ pick: "value" }),
	showing: RefField.meta({ pick: "value" }),
	pack: RefField.meta({ pick: "value" }),
	tag: RefField.meta({ pick: "value" }),
	kind: z.enum(["board", "inline"]).optional(),
});

export const CountFieldsSchema = FiltersFieldsSchema.extend({ which: CountsSchema.keyof() });

export const KeywordFieldsSchema = z.object({ keyword: RefField.meta({ pick: "value" }) });

export const PageFieldsSchema = z.object({ picked: RefField.meta({ pick: "value" }) });

export const JobFieldsSchema = z.object({ widget: z.string().optional() });

export const NoFieldsSchema = z.object({});

export const ClearFieldsSchema = z.object({
	targets: z.array(PropRefSchema).optional(),
});

export type CatalogueEntry = z.infer<typeof CatalogueEntrySchema>;
export type Facet = z.infer<typeof FacetSchema>;
export type Counts = z.infer<typeof CountsSchema>;
export type TemplateRow = z.infer<typeof TemplateRowSchema>;
export type DocPageRow = z.infer<typeof DocPageRowSchema>;
export type DocPageShown = z.infer<typeof DocPageSchema>;
export type Said = z.infer<typeof SaidSchema>;
export type FiltersFields = z.infer<typeof FiltersFieldsSchema>;
export type CountFields = z.infer<typeof CountFieldsSchema>;
export type KeywordFields = z.infer<typeof KeywordFieldsSchema>;
export type PageFields = z.infer<typeof PageFieldsSchema>;
export type JobFields = z.infer<typeof JobFieldsSchema>;
export type NoFields = z.infer<typeof NoFieldsSchema>;
export type ClearFields = z.infer<typeof ClearFieldsSchema>;
export type InstallJobRow = z.infer<typeof InstallJobSchema>;
