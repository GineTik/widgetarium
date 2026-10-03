import { z } from "zod";
import { definePack } from "@widgetarium/core/engine/packs.js";
import { defineGatewayMetadata } from "@widgetarium/core/gateway/implementation-metadata.js";
import { STAT_ALGORITHMS } from "@widgetarium/core/engine/stat-fields.js";
import { STAT_TITLES } from "./stat-of.js";
import { folderStatQueryFor } from "./folder-stat-queries.js";
import {
	BreakdownFieldsSchema,
	BreakdownQuery,
	NumberFieldsSchema,
	NumberQuery,
	SeriesFieldsSchema,
	SeriesQuery,
	StreakFieldsSchema,
	StreakQuery,
} from "./list-stat-queries.js";

export { BreakdownQuery, NumberQuery, SeriesQuery, StreakQuery, folderStatQueryFor };
export { PointSchema, ShareSchema, StreakSchema } from "./list-stat-queries.js";
export { breakdownOf, seriesOf } from "./aggregate.js";

export const statsPack = definePack({
	id: "@stats",
	title: "Statistics",
	queries: [
		...STAT_ALGORITHMS.map((algorithm) =>
			defineGatewayMetadata(folderStatQueryFor(algorithm), {
				id: `@stats/${algorithm}`,
				title: STAT_TITLES[algorithm] ?? algorithm,
				resource: "Statistics",
				description: "One number counted over the notes of a folder.",
				fields: z.looseObject({ path: z.string().optional() }),
			}),
		),
		defineGatewayMetadata(NumberQuery, {
			id: "@stats/number",
			title: "One number",
			resource: "Statistics",
			description: "One number counted over the rows another widget holds.",
			fields: NumberFieldsSchema,
		}),
		defineGatewayMetadata(SeriesQuery, {
			id: "@stats/series",
			title: "Over time",
			resource: "Statistics",
			description: "A number per day, week or month, counted over the rows another widget holds.",
			fields: SeriesFieldsSchema,
		}),
		defineGatewayMetadata(BreakdownQuery, {
			id: "@stats/breakdown",
			title: "Split by a property",
			resource: "Statistics",
			description: "A number per value of a property, with its share of the whole.",
			fields: BreakdownFieldsSchema,
		}),
		defineGatewayMetadata(StreakQuery, {
			id: "@stats/days-kept",
			title: "Days in a row, now and at best",
			resource: "Statistics",
			description: "The current and the longest run of days the rows another widget holds were kept.",
			fields: StreakFieldsSchema,
		}),
	],
	commands: [],
});
