import {
	IQuery,
	IRepeat,
	PageInputSchema,
	PageOf,
	VaultRecordSchema,
	createWidget,
	defineLayout,
	defineMetadata,
	useData,
	z,
} from "widgetarium";
import { FeedList } from "./feed-list";
import { FeedSaid } from "./feed-said";
import type { Drawn, Given, ItemSlot } from "./types";

const PAGE_SIZE = 10;

const NO_SLOT = "This feed has no widget to draw its items with.";
const NOTHING = "Nothing here yet.";

export const ItemSchema = VaultRecordSchema.extend({ content: z.string().nullable().optional() });

const FeedWidget = createWidget({
	inject: {
		getItems: IQuery.input(PageInputSchema).output(PageOf(ItemSchema)),
		getPageSize: IQuery.output(z.number().default(PAGE_SIZE)),
		item: IRepeat.of<Given>({
			default: "@default/obsidian-markdown-preview",
			surface: "group",
			gives: { getSource: ["content", "path"] },
		}),
	},
	draw: ({ getItems, getPageSize: pageSize, item }) => {
		const listed = useData(getItems, { limit: pageSizeOf(pageSize) });
		const said = saidInstead(item, listed);
		if (said) return <FeedSaid text={said} />;
		return <FeedList items={listed.data} Drawn={item as Drawn} hasMore={listed.hasMore} onMore={listed.more} />;
	},
});

export const metadata = defineMetadata(FeedWidget, {
	title: "Feed",
	description:
		"A list that never ends: every record of a folder drawn by the widget in its slot, ten more each time the end comes into view.",
	keywords: [
		"feed",
		"list",
		"stream",
		"timeline",
		"scroll",
		"infinite",
		"journal",
		"daily",
		"notes",
		"posts",
		"comments",
		"cards",
	],
	preview: {
		size: { w: 5, h: 5 },
		props: {
			getItems: {
				rows: [
					{ path: "preview/2026-09-16.md", content: "## Wednesday\nShipped the feed and the kanban cards." },
					{ path: "preview/2026-09-15.md", content: "## Tuesday\nSpacing is read off the tree now." },
					{ path: "preview/2026-09-14.md", content: "## Monday\nA quiet day of planning." },
				],
			},
		},
	},
	props: {
		getItems: {
			label: "Items",
			aka: ["items"],
			hint: "The records the feed draws, one after another, newest first when the source is sorted that way.",
		},
		getPageSize: {
			label: "Items per load",
			aka: ["pageSize"],
			hint: "How many more are drawn each time the end of the feed comes into view.",
		},
	},
});

export const layout = defineLayout({
	role: "collection",
	size: { preferredWidth: "full", preferredHeight: "auto" },
});

export default FeedWidget;

function saidInstead(
	slot: ItemSlot | null | undefined,
	listed: { failure: string | null; isLoading: boolean; data: readonly unknown[] },
) {
	if (!slot) return NO_SLOT;
	if (listed.data.length > 0 || listed.isLoading) return null;
	return listed.failure ?? NOTHING;
}

function pageSizeOf(pageSize: number) {
	const asked = Math.round(pageSize);
	return asked > 0 ? asked : PAGE_SIZE;
}
