import { defineLayout, defineMetadata, ICarrier, IPreview } from "@widgetarium/core/gateway/declared.js";
import { ICommand, IQuery } from "@widgetarium/core/gateway/queries.js";
import { createWidget } from "@widgetarium/core/widget-api.js";
import { useData } from "@widgetarium/core/gateway/use-data.js";
import { z } from "zod";
import { useShown, useWhenSeen } from "@widgetarium/kit";
import { createElement as h, useCallback } from "react";
import { EntryCard } from "./entry-card.js";
import { EntrySchema, SaidSchema } from "./types.js";
import type { Entry } from "./types.js";

const PAGE_SIZE = 12;
const SHOWN_KEY = "@catalogue/widget-list";
const SHORT = "These want more than this slot hands down";
const NOTHING = "Nothing here answers to that.";

const WidgetList = createWidget({
	inject: {
		getEntries: IQuery.output(z.array(EntrySchema).default([])),
		getSaid: IQuery.output(SaidSchema.default({ title: "", lead: "", mode: "browse", isAsking: false })),
		getPageSize: IQuery.output(z.number().default(PAGE_SIZE)),
		install: ICommand.input(z.object({ widget: z.string() })),
		pick: ICommand.input(z.object({ widget: z.string() })),
		place: ICommand.input(z.object({ widget: z.string(), at: z.unknown() })),
		preview: IPreview,
		carrier: ICarrier,
	},
	draw: ({ getEntries, getSaid: said, getPageSize: pageSize, install, pick, place, preview, carrier }) => {
		const size = Math.max(1, Math.round(pageSize));
		const { shown, more } = useShown(SHOWN_KEY, size);
		const listed = useData(getEntries, { offset: 0, limit: shown });
		const rest = Math.max(0, (listed.total ?? listed.data.length) - listed.data.length);
		const hasMore = rest > 0;
		const loadMore = useCallback(() => more(), [more, shown, hasMore]);
		const end = useWhenSeen(loadMore);
		if (listed.failure) return <p className="wg-studio-catalogue-none">{listed.failure}</p>;
		if (!listed.isLoading && listed.data.length === 0) return <p className="wg-studio-catalogue-none">{NOTHING}</p>;
		return (
			<div>
				<div className="wg-studio-catalogue-list">
					{listed.data.map((entry: Entry, at: number) => [
						entry.lacks && !listed.data[at - 1]?.lacks ? (
							<p key={`short-${entry.ref}`} className="wg-studio-catalogue-divide">
								{SHORT}
							</p>
						) : null,
						<EntryCard
							key={entry.ref}
							entry={entry}
							isAsking={said.isAsking}
							Preview={preview.Drawn}
							install={install}
							pick={pick}
							place={place}
							carrier={carrier}
						/>,
					])}
					{hasMore ? <div ref={end} className="wg-studio-catalogue-end" aria-hidden="true" /> : null}
				</div>
			</div>
		);
	},
});

export const metadata = defineMetadata(WidgetList, {
	title: "Widget list",
	description: "Widgets drawn as they look: press one to add it, or drag it onto a board or into a note.",
	keywords: ["catalogue", "widgets", "install", "store", "gallery", "cards", "drag", "place", "add"],
	preview: {
		size: { w: 4, h: 5 },
		props: {
			getEntries: {
				rows: [
					{
						id: "@default/metric-total",
						scope: "@default",
						name: "Metric total",
						title: "Metric total",
						description: "A running total over a window, the curve or bars behind it, and the day's own reading.",
						tags: ["chart"],
						installed: true,
						action: "add",
						update: null,
						job: null,
						lacks: null,
					},
				],
			},
		},
	},
	props: {
		getEntries: {
			aka: ["entries"],
			label: "Widgets",
			hint: "The widgets to show.",
		},
		getSaid: { label: "What the catalogue is asked for", hint: "What the catalogue was opened for." },
		getPageSize: { aka: ["pageSize"], label: "Widgets per load" },
		install: {
			label: "Install a widget",
			source: { implementation: "@catalogue/install", fields: {} },
		},
		pick: {
			label: "Pick a widget",
			source: { implementation: "@catalogue/pick", fields: {} },
		},
		place: {
			label: "Place a dropped widget",
			source: { implementation: "@catalogue/place", fields: {} },
		},
	},
});

export const layout = defineLayout({ role: "collection", size: { preferredWidth: "full", preferredHeight: "auto" } });

export default WidgetList;
