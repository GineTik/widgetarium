import { definePack } from "@widgetarium/core/engine/packs.js";
import { defineCommandMetadata, defineGatewayMetadata } from "@widgetarium/core/gateway/implementation-metadata.js";
import {
	ClearFiltersCommand,
	InstallCommand,
	OpenViewCommand,
	PickCommand,
	PlaceCommand,
	UninstallCommand,
	ApplyTemplateCommand,
} from "./commands.js";
import {
	CountQuery,
	EntriesQuery,
	InstallJobQuery,
	PacksQuery,
	SaidQuery,
	ShowingQuery,
	TagsQuery,
	TemplatesQuery,
} from "./queries.js";
import { DocPageQuery, DocPagesQuery, DocsSaidQuery } from "./docs-queries.js";
import {
	ClearFieldsSchema,
	CountFieldsSchema,
	FiltersFieldsSchema,
	JobFieldsSchema,
	KeywordFieldsSchema,
	NoFieldsSchema,
	PageFieldsSchema,
} from "./schemas.js";

export * from "./schemas.js";
export * from "./queries.js";
export * from "./docs-queries.js";
export * from "./commands.js";

const FacetFieldsSchema = KeywordFieldsSchema.extend({ kind: FiltersFieldsSchema.shape.kind });

export const cataloguePack = definePack({
	id: "@catalogue",
	title: "Widget catalogue",
	queries: [
		defineGatewayMetadata(EntriesQuery, {
			id: "@catalogue/entries",
			title: "Widgets",
			resource: "Catalogue",
			description: "The widgets you can add, narrowed by the search and the filters.",
			fields: FiltersFieldsSchema,
		}),
		defineGatewayMetadata(CountQuery, {
			id: "@catalogue/count",
			title: "How many widgets",
			resource: "Catalogue",
			description: "One number about the catalogue, such as how many widgets are shown.",
			fields: CountFieldsSchema,
		}),
		defineGatewayMetadata(ShowingQuery, {
			id: "@catalogue/showing",
			title: "What is shown",
			resource: "Catalogue",
			description: "All widgets, the installed ones and those with an update, each counted.",
			fields: FiltersFieldsSchema,
		}),
		defineGatewayMetadata(PacksQuery, {
			id: "@catalogue/packs",
			title: "Packs",
			resource: "Catalogue",
			description: "Every widget pack, with how many widgets it holds.",
			fields: FacetFieldsSchema,
		}),
		defineGatewayMetadata(TagsQuery, {
			id: "@catalogue/tags",
			title: "Tags",
			resource: "Catalogue",
			description: "Every widget tag, most used first.",
			fields: FacetFieldsSchema,
		}),
		defineGatewayMetadata(TemplatesQuery, {
			id: "@catalogue/templates",
			title: "Templates",
			resource: "Catalogue",
			description: "The templates you can make a page from.",
			fields: KeywordFieldsSchema,
		}),
		defineGatewayMetadata(SaidQuery, {
			id: "@catalogue/said",
			title: "Heading",
			resource: "Catalogue",
			description: "The catalogue's title and the line under it.",
			fields: NoFieldsSchema,
		}),
		defineGatewayMetadata(DocsSaidQuery, {
			id: "@catalogue/docs-said",
			title: "Docs heading",
			resource: "Catalogue",
			description: "The documentation's title and the line under it.",
			fields: NoFieldsSchema,
		}),
		defineGatewayMetadata(DocPagesQuery, {
			id: "@catalogue/doc-pages",
			title: "Docs pages",
			resource: "Catalogue",
			description: "The documentation's pages, narrowed by the search.",
			fields: KeywordFieldsSchema,
		}),
		defineGatewayMetadata(DocPageQuery, {
			id: "@catalogue/doc-page",
			title: "One docs page",
			resource: "Catalogue",
			description: "The documentation page that is picked.",
			fields: PageFieldsSchema,
		}),
		defineGatewayMetadata(InstallJobQuery, {
			id: "@catalogue/install-job",
			title: "Install progress",
			resource: "Catalogue",
			description: "How far a widget's install has got, or why it failed.",
			fields: JobFieldsSchema,
		}),
	],
	commands: [
		defineCommandMetadata(InstallCommand, {
			id: "@catalogue/install",
			title: "Install a widget",
			resource: "Catalogue",
			description: "Adds the widget to this vault.",
			fields: NoFieldsSchema,
			consent: "free",
		}),
		defineCommandMetadata(UninstallCommand, {
			id: "@catalogue/uninstall",
			title: "Remove a widget",
			resource: "Catalogue",
			description: "Removes the widget from this vault after asking.",
			fields: NoFieldsSchema,
			consent: "always",
		}),
		defineCommandMetadata(PickCommand, {
			id: "@catalogue/pick",
			title: "Pick a widget",
			resource: "Catalogue",
			description: "Uses the widget for whatever the catalogue was opened for.",
			fields: NoFieldsSchema,
			consent: "free",
		}),
		defineCommandMetadata(PlaceCommand, {
			id: "@catalogue/place",
			title: "Place a widget",
			resource: "Catalogue",
			description: "Puts the widget where it was dropped.",
			fields: NoFieldsSchema,
			consent: "free",
		}),
		defineCommandMetadata(ApplyTemplateCommand, {
			id: "@catalogue/use-template",
			title: "Create a page from a template",
			resource: "Catalogue",
			description: "Makes a new page from the template.",
			fields: NoFieldsSchema,
			consent: "free",
		}),
		defineCommandMetadata(OpenViewCommand, {
			id: "@catalogue/open-view",
			title: "Open the catalogue or the docs",
			resource: "Catalogue",
			description: "Shows the widget catalogue or the documentation in the sidebar.",
			fields: NoFieldsSchema,
			consent: "free",
		}),
		defineCommandMetadata(ClearFiltersCommand, {
			id: "@catalogue/clear-filters",
			title: "Clear filters",
			resource: "Catalogue",
			description: "Turns every filter off, so everything shows again.",
			fields: ClearFieldsSchema,
			consent: "free",
		}),
	],
});
