import { z } from "zod";
import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import type { Query, Row, RowsResult } from "@widgetarium/core/gateway/contract.js";
import { rowOf } from "@widgetarium/core/gateway/create.js";
import { IQuery } from "@widgetarium/core/gateway/queries.js";
import type { CatalogueMode } from "@widgetarium/core/engine/catalogue-requests.js";
import { rankSearch } from "@widgetarium/core/engine/search.js";
import {
	actionFor,
	EVERY_PACK,
	facetsMatching,
	facetsOf,
	filterEntries,
	fromManifest,
	keywordsOf,
	layOut,
	packOf,
	shortName,
} from "@widgetarium/core/catalogue-entries.js";
import type { MergedEntry, Showing } from "@widgetarium/core/catalogue-entries.js";
import { templateSketch, templateWidgets } from "@widgetarium/core/templates.js";
import type { Template } from "@widgetarium/core/templates.js";
import { EVERY_ROW, pageRows, refsIn, rowAt, textOf, valueAt, watchCatalogue } from "./query-reads.js";
import type { OnChanged } from "./query-reads.js";
import { CatalogueEntrySchema, FacetSchema, InstallJobSchema, SaidSchema, TemplateRowSchema } from "./schemas.js";
import type {
	CatalogueEntry,
	CountFields,
	Counts,
	Facet,
	FiltersFields,
	InstallJobRow,
	JobFields,
	KeywordFields,
	NoFields,
	Said,
	TemplateRow,
} from "./schemas.js";

const SHOWING: readonly { readonly name: Showing; readonly label: string; readonly icon: string }[] = [
	{ name: "all", label: "All widgets", icon: "widget" },
	{ name: "installed", label: "Installed", icon: "tick" },
	{ name: "update", label: "Update ready", icon: "update" },
];

const SAID: Readonly<Record<CatalogueMode, { readonly title: string; readonly lead: string }>> = {
	browse: { title: "Widgets", lead: "Every widget this vault can draw, shown as it really looks" },
	place: { title: "Add a widget", lead: "Pick one and it lands on this board" },
	fill: { title: "Fill this slot", lead: "Pick the widget this slot draws for every row" },
	text: { title: "Pick a widget", lead: "The widget this trigger draws, wherever the text appears" },
	mount: { title: "Add a view", lead: "Pick a widget and it becomes a view with a name of your own" },
	template: { title: "Templates", lead: "Pick one and it becomes a page, with every widget it stands on" },
};

export class EntriesQuery extends IQuery.returns(z.array(CatalogueEntrySchema)) {
	constructor(
		private readonly fields: FiltersFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async get(ref: string): Promise<Row<CatalogueEntry> | null> {
		return rowAt(await this.list(EVERY_ROW), ref);
	}

	async list(query?: Query): Promise<RowsResult<CatalogueEntry>> {
		const shown = await shownEntries(this.fields, this.ports);
		return pageRows(
			shown.map((entry) => rowOf<CatalogueEntry>(entry, entry.id)),
			query,
		);
	}

	override subscribe(changed: OnChanged): () => void {
		return watchCatalogue(this.ports, filterRefsOf(this.fields), changed);
	}
}

export class CountQuery extends IQuery.returns(z.number()) {
	constructor(
		private readonly fields: CountFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async get(): Promise<number> {
		return (await countsOf(this.fields, this.ports))[this.fields.which];
	}

	override subscribe(changed: OnChanged): () => void {
		return watchCatalogue(this.ports, filterRefsOf(this.fields), changed);
	}
}

export class ShowingQuery extends IQuery.returns(z.array(FacetSchema)) {
	constructor(
		private readonly fields: FiltersFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async get(ref: string): Promise<Row<Facet> | null> {
		return rowAt(await this.list(EVERY_ROW), ref);
	}

	async list(query?: Query): Promise<RowsResult<Facet>> {
		const counts = showingCounts(await this.ports.catalogue.entries(kindOf(this.fields)));
		const rows = SHOWING.map((one) => ({
			name: one.name,
			label: one.label,
			icon: one.icon,
			count: counts[one.name],
			...(one.name === "update" ? { tone: "warning" } : {}),
		}));
		return pageRows(
			rows.map((row) => rowOf<Facet>(row, row.name)),
			query,
		);
	}

	override subscribe(changed: OnChanged): () => void {
		return watchCatalogue(this.ports, [], changed);
	}
}

export class PacksQuery extends IQuery.returns(z.array(FacetSchema)) {
	constructor(
		private readonly fields: KeywordFields & Pick<FiltersFields, "kind">,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async get(ref: string): Promise<Row<Facet> | null> {
		return rowAt(await this.list(EVERY_ROW), ref);
	}

	async list(query?: Query): Promise<RowsResult<Facet>> {
		const merged = await this.ports.catalogue.entries(this.fields.kind ?? "board");
		const keyword = textOf(await valueAt(this.ports, this.fields.keyword)) ?? "";
		const rows = facetsMatching(facetsOf(merged).packs, keyword).map((facet) => ({
			name: facet.name,
			label: facet.name,
			count: facet.count,
			mark: facet.name.replace("@", "").charAt(0).toUpperCase(),
		}));
		return pageRows(
			rows.map((row) => rowOf<Facet>(row, row.name)),
			query,
		);
	}

	override subscribe(changed: OnChanged): () => void {
		return watchCatalogue(this.ports, refsIn([this.fields.keyword]), changed);
	}
}

export class TagsQuery extends IQuery.returns(z.array(FacetSchema)) {
	constructor(
		private readonly fields: KeywordFields & Pick<FiltersFields, "kind">,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async get(ref: string): Promise<Row<Facet> | null> {
		return rowAt(await this.list(EVERY_ROW), ref);
	}

	async list(query?: Query): Promise<RowsResult<Facet>> {
		const merged = await this.ports.catalogue.entries(this.fields.kind ?? "board");
		const keyword = textOf(await valueAt(this.ports, this.fields.keyword)) ?? "";
		const rows = facetsMatching(facetsOf(merged).tags, keyword).map((facet) => ({
			name: facet.name,
			label: facet.name,
			count: facet.count,
		}));
		return pageRows(
			rows.map((row) => rowOf<Facet>(row, row.name)),
			query,
		);
	}

	override subscribe(changed: OnChanged): () => void {
		return watchCatalogue(this.ports, refsIn([this.fields.keyword]), changed);
	}
}

export class TemplatesQuery extends IQuery.returns(z.array(TemplateRowSchema)) {
	constructor(
		private readonly fields: KeywordFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async get(ref: string): Promise<Row<TemplateRow> | null> {
		return rowAt(await this.list(EVERY_ROW), ref);
	}

	async list(query?: Query): Promise<RowsResult<TemplateRow>> {
		const keyword = textOf(await valueAt(this.ports, this.fields.keyword)) ?? "";
		const templates = this.ports.catalogue.templates();
		const found = keyword.trim() ? rankSearch(keyword, templates).map((hit) => hit.record) : templates;
		const titleOf = (widget: string | null): string =>
			titleIn(widget ? this.ports.catalogue.entryOf(widget) : null) ?? widget ?? "";
		const rows = found.map((template) => templateRowOf(template, titleOf));
		return pageRows(
			rows.map((row) => rowOf<TemplateRow>(row, row.id)),
			query,
		);
	}

	override subscribe(changed: OnChanged): () => void {
		return watchCatalogue(this.ports, refsIn([this.fields.keyword]), changed);
	}
}

export class SaidQuery extends IQuery.returns(SaidSchema) {
	constructor(
		readonly fields: NoFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async get(): Promise<Said> {
		const request = this.ports.catalogue.requests.current();
		const mode = request?.mode ?? "browse";
		return { ...SAID[mode], mode, isAsking: request !== null };
	}

	override subscribe(changed: OnChanged): () => void {
		return watchCatalogue(this.ports, [], changed);
	}
}

export class InstallJobQuery extends IQuery.returns(InstallJobSchema.nullable()) {
	constructor(
		private readonly fields: JobFields,
		private readonly ports: ImplementationPorts,
	) {
		super();
	}

	async get(): Promise<InstallJobRow | null> {
		return this.fields.widget ? this.ports.catalogue.jobs.jobOf(this.fields.widget) : null;
	}

	override subscribe(changed: OnChanged): () => void {
		return this.ports.catalogue.jobs.subscribe(changed);
	}
}

interface Filters {
	readonly keyword: string;
	readonly showing: Showing;
	readonly pack: string;
	readonly tag: string | null;
}

async function filtersOf(fields: FiltersFields, ports: ImplementationPorts): Promise<Filters> {
	const [keyword, showing, pack, tag] = await Promise.all(
		[fields.keyword, fields.showing, fields.pack, fields.tag].map((ref) => valueAt(ports, ref)),
	);
	const asShowing = SHOWING.find((one) => one.name === textOf(showing))?.name ?? "all";
	return { keyword: textOf(keyword) ?? "", showing: asShowing, pack: textOf(pack) ?? EVERY_PACK, tag: textOf(tag) };
}

async function countsOf(fields: FiltersFields, ports: ImplementationPorts): Promise<Counts> {
	const merged = await ports.catalogue.entries(kindOf(fields));
	const shown = await shownEntries(fields, ports);
	const filters = await filtersOf(fields, ports);
	return {
		...showingCounts(merged),
		shown: shown.length,
		narrowed: [filters.showing !== "all", filters.pack !== EVERY_PACK, filters.tag !== null].filter(Boolean).length,
	};
}

function showingCounts(merged: readonly MergedEntry[]): Readonly<Record<Showing, number>> {
	return {
		all: merged.length,
		installed: merged.filter((entry) => entry.installed).length,
		update: merged.filter((entry) => entry.update).length,
	};
}

async function shownEntries(fields: FiltersFields, ports: ImplementationPorts): Promise<CatalogueEntry[]> {
	const request = ports.catalogue.requests.current();
	const merged = await ports.catalogue.entries(request?.kind ?? kindOf(fields));
	const filters = await filtersOf(fields, ports);
	const kept = filterEntries(merged, filters).map((entry) => ({
		...entry,
		fit: request?.rank?.(entry.manifest) ?? null,
	}));
	const found = filters.keyword.trim()
		? rankSearch(filters.keyword, kept, { read: fromManifest }).map((hit) => hit.record)
		: [...kept].sort((one, other) => (one.fit?.order ?? 0) - (other.fit?.order ?? 0));
	return layOut(found).placed.map((entry) => entryRowOf(entry, entry.fit?.lacks ?? null, ports));
}

function entryRowOf(entry: MergedEntry, lacks: string | null, ports: ImplementationPorts): CatalogueEntry {
	const id = textIn(entry.manifest["id"]) ?? "";
	return {
		...namesOf(entry, id),
		installed: entry.installed,
		action: actionFor(entry),
		update: entry.update,
		job: ports.catalogue.jobs.jobOf(id),
		lacks,
	};
}

function namesOf(
	entry: MergedEntry,
	id: string,
): Pick<CatalogueEntry, "id" | "scope" | "name" | "title" | "description" | "tags"> {
	return {
		id,
		scope: packOf(entry.manifest),
		name: shortName(entry.manifest),
		title: titleIn(entry) ?? id,
		description: textIn(entry.manifest["description"]) ?? "",
		tags: keywordsOf(entry.manifest),
	};
}

function templateRowOf(template: Template, titleOf: (widget: string | null) => string): TemplateRow {
	return {
		id: template.id,
		title: template.title,
		description: template.description,
		widgets: templateWidgets(template),
		sketch: templateSketch(template).map((region) => ({ name: region.name, rows: sketchRowsOf(region.rows, titleOf) })),
	};
}

function sketchRowsOf(
	rows: ReturnType<typeof templateSketch>[number]["rows"],
	titleOf: (widget: string | null) => string,
): TemplateRow["sketch"][number]["rows"] {
	return rows.map((row) => row.map((cell) => ({ label: titleOf(cell.widget), grow: cell.ratio ?? 1 })));
}

function titleIn(entry: MergedEntry | null): string | null {
	return textIn(entry?.manifest["title"]);
}

function textIn(held: unknown): string | null {
	return typeof held === "string" ? held : null;
}

function kindOf(fields: Pick<FiltersFields, "kind">): "board" | "inline" {
	return fields.kind ?? "board";
}

function filterRefsOf(fields: FiltersFields): string[] {
	return refsIn([fields.keyword, fields.showing, fields.pack, fields.tag]);
}
