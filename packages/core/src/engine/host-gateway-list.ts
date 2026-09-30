import { z } from "zod";
import { defineGatewayMetadata } from "../gateway/implementation-metadata.js";
import type { GatewayMetadata } from "../gateway/implementation-metadata.js";
import type { EngineBackedRows, EngineBackedValue } from "./engine-backed.js";
import {
	FileGateway,
	FolderGateway,
	FromTileRowsGateway,
	FromTileValueGateway,
	STAT_TITLES,
	ScreenStateGateway,
	SelectedRowGateway,
	SelectionGateway,
	TypedRowsGateway,
	TypedValueGateway,
	statisticsGatewayFor,
} from "./host-gateway-classes.js";
import { STAT_ALGORITHMS } from "../gateway/stats.js";
import { PropRefSchema } from "./prop-ref.js";

export type HostGatewayEntry = GatewayMetadata<typeof EngineBackedValue | typeof EngineBackedRows>;

const RowsQuerySchema = {
	where: z.array(z.looseObject({})).optional(),
	sort: z.array(z.looseObject({})).optional(),
};

export const HOST_GATEWAYS: readonly HostGatewayEntry[] = [
	defineGatewayMetadata(TypedValueGateway, {
		id: "@core/typed-value",
		title: "Typed here",
		description: "A value typed into the tile and kept in the note.",
		fields: z.looseObject({ value: z.unknown().optional() }),
	}),
	defineGatewayMetadata(TypedRowsGateway, {
		id: "@core/typed-rows",
		title: "Typed here",
		description: "Rows typed into the tile and kept in the note.",
		fields: z.looseObject({ rows: z.array(z.unknown()).optional(), ...RowsQuerySchema }),
	}),
	defineGatewayMetadata(ScreenStateGateway, {
		id: "@core/screen-state",
		title: "This screen",
		description: "A value that lives while the screen is open and never reaches the note.",
		fields: z.looseObject({}),
	}),
	defineGatewayMetadata(FileGateway, {
		id: "@core/file",
		title: "File",
		description: "One note, or one property of it.",
		fields: z.looseObject({ path: z.string().optional(), field: z.string().optional() }),
	}),
	defineGatewayMetadata(FolderGateway, {
		id: "@core/folder",
		title: "Folder",
		description: "Every note in a folder, one row per note.",
		fields: z.looseObject({
			path: z.string().optional(),
			map: z.record(z.string(), z.string()).optional(),
			...RowsQuerySchema,
		}),
	}),
	defineGatewayMetadata(FromTileValueGateway, {
		id: "@core/from-tile-value",
		title: "From a widget",
		description: "The value another tile on this board holds.",
		fields: z.looseObject({ ref: PropRefSchema }),
	}),
	defineGatewayMetadata(FromTileRowsGateway, {
		id: "@core/from-tile-rows",
		title: "From a widget",
		description: "The rows another tile on this board holds.",
		fields: z.looseObject({ ref: PropRefSchema }),
	}),
	...STAT_ALGORITHMS.map((algorithm) =>
		defineGatewayMetadata(statisticsGatewayFor(algorithm), {
			id: `@core/stat-${algorithm}`,
			title: STAT_TITLES[algorithm] ?? algorithm,
			description: "One number counted over the notes of a folder.",
			fields: z.looseObject({ path: z.string().optional() }),
		}),
	),
	defineGatewayMetadata(SelectedRowGateway, {
		id: "@core/selected-row",
		title: "Picked in a widget",
		description: "The row of a list that another widget, or this screen, has picked.",
		fields: z.looseObject({
			rows: PropRefSchema,
			picked: PropRefSchema.optional(),
			field: z.string().optional(),
			fieldFrom: PropRefSchema.optional(),
			whenNothingPicked: z.enum(["none", "first"]).default("first"),
		}),
	}),
	defineGatewayMetadata(SelectionGateway, {
		id: "@core/selection",
		title: "Chosen from a list",
		description: "Which row of a list is chosen, kept while the screen is open.",
		fields: z.looseObject({
			rows: PropRefSchema,
			field: z.string().optional(),
			fieldFrom: PropRefSchema.optional(),
			whenNothingPicked: z.enum(["none", "first"]).default("none"),
		}),
	}),
];
