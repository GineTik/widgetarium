import { definePack } from "@widgetarium/core/engine/packs.js";
import { defineCommandMetadata, defineGatewayMetadata } from "@widgetarium/core/gateway/implementation-metadata.js";
import { AppsQuery, CurrentAppQuery } from "./apps-queries.js";
import {
	BackToViewCommand,
	CreateAppCommand,
	EditInCanvasCommand,
	OpenAppCommand,
	ToggleAssistantCommand,
} from "./studio-commands.js";
import { IsAssistantOpenQuery, IsInCanvasQuery } from "./studio-state-queries.js";
import { AppFieldsSchema, NoFieldsSchema } from "./studio-fields.js";

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
		defineGatewayMetadata(IsAssistantOpenQuery, {
			id: "@studio/is-assistant-open",
			title: "AI sidebar open",
			resource: RESOURCE,
			description: "Whether the AI sidebar stands beside the app.",
			fields: NoFieldsSchema,
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
		defineCommandMetadata(ToggleAssistantCommand, {
			id: "@studio/toggle-assistant",
			title: "AI sidebar",
			resource: RESOURCE,
			description: "Opens or closes the AI sidebar.",
			fields: NoFieldsSchema,
			consent: "free",
		}),
	],
});
