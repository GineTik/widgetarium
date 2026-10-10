import { definePack } from "@widgetarium/core/engine/packs.js";
import { defineCommandMetadata, defineGatewayMetadata } from "@widgetarium/core/gateway/implementation-metadata.js";
import { CreateAppCommand, EditInCanvasCommand, OpenAppCommand, ToggleAssistantCommand } from "./commands.js";
import { AppsQuery, CurrentAppQuery } from "./queries.js";
import { AppFieldsSchema, NoFieldsSchema } from "./schemas.js";

export * from "./schemas.js";
export * from "./queries.js";
export * from "./commands.js";

export const chromePack = definePack({
	id: "@chrome",
	title: "App chrome",
	queries: [
		defineGatewayMetadata(AppsQuery, {
			id: "@chrome/apps",
			title: "Apps",
			resource: "Apps",
			description: "Every app in this vault, each with its mark and how many pages it has.",
			fields: NoFieldsSchema,
		}),
		defineGatewayMetadata(CurrentAppQuery, {
			id: "@chrome/current-app",
			title: "This app",
			resource: "Apps",
			description: "The app a window shows, named by its folder.",
			fields: AppFieldsSchema,
		}),
	],
	commands: [
		defineCommandMetadata(OpenAppCommand, {
			id: "@chrome/open-app",
			title: "Open an app",
			resource: "Apps",
			description: "Opens the first page of the app.",
			fields: NoFieldsSchema,
			consent: "free",
		}),
		defineCommandMetadata(CreateAppCommand, {
			id: "@chrome/create-app",
			title: "New app",
			resource: "Apps",
			description: "Opens an empty canvas for a new app.",
			fields: NoFieldsSchema,
			consent: "free",
		}),
		defineCommandMetadata(EditInCanvasCommand, {
			id: "@chrome/edit-in-canvas",
			title: "Edit in canvas",
			resource: "Apps",
			description: "Opens the app's design canvas.",
			fields: AppFieldsSchema,
			consent: "free",
		}),
		defineCommandMetadata(ToggleAssistantCommand, {
			id: "@chrome/toggle-assistant",
			title: "AI sidebar",
			resource: "Apps",
			description: "Opens or closes the AI sidebar.",
			fields: NoFieldsSchema,
			consent: "free",
		}),
	],
});
