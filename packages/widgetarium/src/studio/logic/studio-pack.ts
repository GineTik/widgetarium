import { definePack } from "@widgetarium/core/engine/packs.js";
import type { Pack } from "@widgetarium/core/engine/packs.js";
import { cataloguePack } from "@widgetarium/pack-catalogue";
import { defineCommandMetadata, defineGatewayMetadata } from "@widgetarium/core/gateway/implementation-metadata.js";
import { AppsQuery, CurrentAppQuery } from "./apps-queries.js";
import {
	BackToViewCommand,
	CreateAppCommand,
	EditInCanvasCommand,
	OpenAppCommand,
	TogglePanelCommand,
} from "./studio-commands.js";
import { IsInCanvasQuery, IsPanelOpenQuery } from "./studio-state-queries.js";
import { AppFieldsSchema, NoFieldsSchema, PanelFieldsSchema } from "./studio-fields.js";

const RESOURCE = "Apps";

export const studioPack = definePack({
	id: "@studio",
	title: "Studio",
	queries: [
		defineGatewayMetadata(AppsQuery, {
			id: "@studio/apps",
			title: "Apps",
			resource: RESOURCE,
			description: "Every app the host holds, each with its mark and how many pages it has.",
			fields: NoFieldsSchema,
		}),
		defineGatewayMetadata(CurrentAppQuery, {
			id: "@studio/current-app",
			title: "This app",
			resource: RESOURCE,
			description: "The app the studio shows, named by its id.",
			fields: AppFieldsSchema,
		}),
		defineGatewayMetadata(IsInCanvasQuery, {
			id: "@studio/is-in-canvas",
			title: "In the canvas",
			resource: RESOURCE,
			description: "Whether the studio shows the app's canvas instead of the app.",
			fields: NoFieldsSchema,
		}),
		defineGatewayMetadata(IsPanelOpenQuery, {
			id: "@studio/is-panel-open",
			title: "Panel open",
			resource: RESOURCE,
			description: "Whether the panel, the AI assistant or the widget catalogue, stands beside the app.",
			fields: PanelFieldsSchema,
		}),
	],
	commands: [
		defineCommandMetadata(OpenAppCommand, {
			id: "@studio/open-app",
			title: "Open an app",
			resource: RESOURCE,
			description: "Opens the app on its first page.",
			fields: NoFieldsSchema,
			consent: "free",
		}),
		defineCommandMetadata(CreateAppCommand, {
			id: "@studio/create-app",
			title: "New app",
			resource: RESOURCE,
			description: "Starts a new app.",
			fields: NoFieldsSchema,
			consent: "free",
		}),
		defineCommandMetadata(EditInCanvasCommand, {
			id: "@studio/edit-in-canvas",
			title: "Edit in canvas",
			resource: RESOURCE,
			description: "Shows the app's design canvas.",
			fields: NoFieldsSchema,
			consent: "free",
		}),
		defineCommandMetadata(BackToViewCommand, {
			id: "@studio/back-to-view",
			title: "Back to view",
			resource: RESOURCE,
			description: "Leaves the canvas for the app.",
			fields: NoFieldsSchema,
			consent: "free",
		}),
		defineCommandMetadata(TogglePanelCommand, {
			id: "@studio/toggle-panel",
			title: "Side panel",
			resource: RESOURCE,
			description: "Opens the panel beside the app, or closes it when it already stands there.",
			fields: PanelFieldsSchema,
			consent: "free",
		}),
	],
});

export const STUDIO_PACKS: readonly Pack[] = [studioPack, cataloguePack];
