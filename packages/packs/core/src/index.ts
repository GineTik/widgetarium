import { z } from "zod";
import { definePack } from "@widgetarium/core/engine/packs.js";
import { PropRefSchema } from "@widgetarium/core/engine/prop-ref.js";
import { defineCommandMetadata, defineGatewayMetadata } from "@widgetarium/core/gateway/implementation-metadata.js";
import {
	ConsoleLogCommand,
	RowsCreateCommand,
	RowsRemoveCommand,
	RowsRepairIdsCommand,
	RowsReplaceCommand,
	RowsUpdateCommand,
	ValueSetCommand,
} from "./commands.js";
import { FetchRowsQuery, FetchValueQuery, FetchFieldsSchema } from "./fetch-queries.js";
import { FetchSendCommand, FetchSendFieldsSchema } from "./fetch-send-command.js";
import { ScreenStateQuery, TypedRowsQuery, TypedValueQuery } from "./typed-queries.js";
import { FromTileRowsQuery, FromTileValueQuery, SelectedRowQuery, SelectionQuery } from "./wiring-queries.js";

export { createTypedGateway } from "./typed-gateway.js";
export {
	ConsoleLogCommand,
	FetchRowsQuery,
	FetchSendCommand,
	FetchValueQuery,
	FromTileRowsQuery,
	FromTileValueQuery,
	RowsCreateCommand,
	RowsRemoveCommand,
	RowsRepairIdsCommand,
	RowsReplaceCommand,
	RowsUpdateCommand,
	ScreenStateQuery,
	SelectedRowQuery,
	SelectionQuery,
	TypedRowsQuery,
	TypedValueQuery,
	ValueSetCommand,
};

const RowsReadSchema = {
	where: z.array(z.looseObject({})).optional(),
	sort: z.array(z.looseObject({})).optional(),
};

const TargetSchema = z.looseObject({ target: PropRefSchema.optional() });

const PickingSchema = {
	field: z.string().optional(),
	fieldFrom: PropRefSchema.optional(),
};

export const corePack = definePack({
	id: "@core",
	title: "This board",
	queries: [
		defineGatewayMetadata(TypedValueQuery, {
			id: "@core/typed-value",
			title: "Typed here",
			description: "A value typed into the tile and kept in the note.",
			fields: z.looseObject({ value: z.unknown().optional() }),
		}),
		defineGatewayMetadata(TypedRowsQuery, {
			id: "@core/typed-rows",
			title: "Typed here",
			description: "Rows typed into the tile and kept in the note.",
			fields: z.looseObject({ rows: z.array(z.unknown()).optional(), ...RowsReadSchema }),
		}),
		defineGatewayMetadata(ScreenStateQuery, {
			id: "@core/screen-state",
			title: "This screen",
			description: "A value that lives while the screen is open and never reaches the note.",
			fields: z.looseObject({}),
		}),
		defineGatewayMetadata(FromTileValueQuery, {
			id: "@core/from-tile-value",
			title: "From a widget",
			description: "The value another tile on this board holds.",
			fields: z.looseObject({ ref: PropRefSchema }),
		}),
		defineGatewayMetadata(FromTileRowsQuery, {
			id: "@core/from-tile-rows",
			title: "From a widget",
			description: "The rows another tile on this board holds.",
			fields: z.looseObject({ ref: PropRefSchema }),
		}),
		defineGatewayMetadata(SelectedRowQuery, {
			id: "@core/selected-row",
			title: "Picked in a widget",
			description: "The row of a list that another widget, or this screen, has picked.",
			fields: z.looseObject({
				rows: PropRefSchema,
				picked: PropRefSchema.optional(),
				...PickingSchema,
				whenNothingPicked: z.enum(["none", "first"]).default("first"),
			}),
		}),
		defineGatewayMetadata(SelectionQuery, {
			id: "@core/selection",
			title: "Chosen from a list",
			description: "Which row of a list is chosen, kept while the screen is open.",
			fields: z.looseObject({
				rows: PropRefSchema,
				...PickingSchema,
				whenNothingPicked: z.enum(["none", "first"]).default("none"),
			}),
		}),
		defineGatewayMetadata(FetchValueQuery, {
			id: "@core/fetch",
			title: "From the web",
			description: "One JSON value read over HTTP.",
			fields: FetchFieldsSchema,
		}),
		defineGatewayMetadata(FetchRowsQuery, {
			id: "@core/fetch-rows",
			title: "From the web",
			description: "A JSON list read over HTTP, a page at a time.",
			fields: FetchFieldsSchema,
		}),
	],
	commands: [
		defineCommandMetadata(ConsoleLogCommand, {
			id: "@core/console-log",
			title: "Print to the console",
			description: "Prints what the widget sends to the developer console and changes nothing.",
			fields: z.looseObject({}),
			consent: "free",
		}),
		defineCommandMetadata(ValueSetCommand, {
			id: "@core/value-set",
			title: "Set a value",
			description: "Sets a value on this board.",
			fields: TargetSchema,
			target: "value",
			consent: "vault-target",
		}),
		defineCommandMetadata(RowsCreateCommand, {
			id: "@core/rows-create",
			title: "Add a row",
			description: "Adds a row to a list on this board.",
			fields: TargetSchema,
			target: "collection",
			consent: "vault-target",
		}),
		defineCommandMetadata(RowsUpdateCommand, {
			id: "@core/rows-update",
			title: "Change a row",
			description: "Rewrites a row of a list on this board.",
			fields: TargetSchema,
			target: "collection",
			consent: "vault-target",
		}),
		defineCommandMetadata(RowsRemoveCommand, {
			id: "@core/rows-remove",
			title: "Remove a row",
			description: "Drops a row from a list on this board.",
			fields: TargetSchema,
			target: "collection",
			consent: "vault-target",
		}),
		defineCommandMetadata(RowsReplaceCommand, {
			id: "@core/rows-replace",
			title: "Replace every row",
			description: "Writes a new set of rows over a list on this board.",
			fields: TargetSchema,
			target: "collection",
			consent: "vault-target",
		}),
		defineCommandMetadata(RowsRepairIdsCommand, {
			id: "@core/rows-repair-ids",
			title: "Repair row ids",
			description: "Gives a fresh id to every row of a list that shares one with another.",
			fields: TargetSchema,
			target: "collection",
			consent: "vault-target",
		}),
		defineCommandMetadata(FetchSendCommand, {
			id: "@core/fetch-send",
			title: "Send to the web",
			description: "Sends what the widget sends as JSON to a URL.",
			fields: FetchSendFieldsSchema,
		}),
	],
});
