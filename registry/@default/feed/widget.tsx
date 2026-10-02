import {
	IListGateway,
	IQuery,
	ISlot,
	VaultRecordSchema,
	createWidget,
	defineLayout,
	defineMetadata,
	defineProps,
	useData,
	z,
} from "widgetarium";
import { FeedPages } from "./feed-pages";
import { FeedSaid } from "./feed-said";
import type { Drawn, Given, ItemSlot } from "./types";
import { usePages } from "widgetarium/kit";

const PAGE_SIZE = 10;

const NO_SLOT = "This feed has no widget to draw its items with.";
const NOTHING = "Nothing here yet.";

export const ItemSchema = VaultRecordSchema.extend({ content: z.string().nullable().optional() });

export const props = defineProps({
	items: IListGateway.of(ItemSchema),
	getPageSize: IQuery.expects(z.number().default(PAGE_SIZE)),
	item: ISlot.of<Given>({
		default: "@default/obsidian-markdown-preview",
		surface: "group",
		gives: { getSource: ["content", "path"] },
	}),
});

const FeedWidget = createWidget({
	inject: props,
	draw: ({ items, getPageSize: pageSize, item }) => {
		const size = pageSizeOf(pageSize);
		const first = useData(items.list, { offset: 0, limit: size });
		const { pages, more } = usePages(items.id, size);
		const said = saidInstead(item, first);
		if (said) return <FeedSaid text={said} />;
		return <FeedPages items={items} Drawn={item as Drawn} size={size} pages={pages} onMore={more} />;
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
			items: {
				rows: [
					{ path: "preview/2026-09-16.md", content: "## Wednesday\nShipped the feed and the kanban cards." },
					{ path: "preview/2026-09-15.md", content: "## Tuesday\nSpacing is read off the tree now." },
					{ path: "preview/2026-09-14.md", content: "## Monday\nA quiet day of planning." },
				],
			},
		},
	},
	props: {
		items: {
			label: "Items",
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
	first: { failure: string | null; isLoading: boolean; total: number | null },
) {
	if (!slot) return NO_SLOT;
	if (first.failure) return first.failure;
	return !first.isLoading && first.total === 0 ? NOTHING : null;
}

function pageSizeOf(pageSize: number) {
	const asked = Math.round(pageSize);
	return asked > 0 ? asked : PAGE_SIZE;
}
