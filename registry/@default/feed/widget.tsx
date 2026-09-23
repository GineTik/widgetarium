import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createWidget, defineManifest, defineProp, useData, valueGateway } from "widgetarium";
import type { Row, Slot, ValueGateway, VaultRecord, WidgetProps } from "widgetarium";
import { SlotList } from "widgetarium/kit";

const CSS = `
.wg-feed { display: flex; flex-direction: column; flex: 1 1 auto; min-width: 0; min-height: 0; overflow: auto; }
.wg-feed-more { flex: none; height: 1px; }
.wg-feed-said { margin: 0; color: var(--wg-kit-text-muted); }
`;

const PAGE_SIZE = 10;
const LOAD_AHEAD = "400px 0px";
const NO_SLOT = "This feed has no widget to draw its items with.";
const NOTHING = "Nothing here yet.";

type Item = VaultRecord & { content?: string | null };
type Items = FeedProps["items"];
type ItemSlot = Slot<{ source: ValueGateway<Item> }>;
type Drawn = NonNullable<ItemSlot>;

type FeedProps = WidgetProps<typeof manifest>;

export const manifest = defineManifest({
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
	role: "collection",
	size: { preferredWidth: "full", preferredHeight: "auto" },
	slots: {
		item: {
			of: "widget",
			default: "@default/obsidian-markdown-preview",
			surface: "group",
			gives: { source: ["content", "path"] },
		},
	},
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
		items: defineProp<Item[]>()({
			label: "Items",
			hint: "The records the feed draws, one after another, newest first when the source is sorted that way.",
			default: [],
		}),
		pageSize: defineProp<number>()({
			label: "Items per load",
			hint: "How many more are drawn each time the end of the feed comes into view.",
			default: PAGE_SIZE,
		}),
	},
});

export default createWidget(manifest, ({ items, pageSize, slots }) => {
	const size = usePageSize(pageSize);
	const first = useData(items.list, { offset: 0, limit: size });
	const { pages, more } = usePages(items.id, size);
	const said = saidInstead(slots?.item, first);
	if (said) return <FeedSaid text={said} />;
	return <FeedPages items={items} Drawn={slots?.item as Drawn} size={size} pages={pages} onMore={more} />;
});

function saidInstead(
	slot: ItemSlot | undefined,
	first: { failure: string | null; isLoading: boolean; total: number | null },
) {
	if (!slot) return NO_SLOT;
	if (first.failure) return first.failure;
	return !first.isLoading && first.total === 0 ? NOTHING : null;
}

function usePageSize(pageSize: FeedProps["pageSize"]) {
	const asked = Math.round(Number(useData(pageSize.get).data));
	return asked > 0 ? asked : PAGE_SIZE;
}

function usePages(source: string, size: number) {
	const [pages, setPages] = useState(1);
	const more = useCallback(() => setPages((held) => held + 1), []);
	useEffect(() => setPages(1), [source, size]);
	return { pages, more };
}

function useWhenSeen(onSeen: () => void) {
	const mark = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const node = mark.current;
		if (!node) return undefined;
		const watcher = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) onSeen();
			},
			{ rootMargin: LOAD_AHEAD },
		);
		watcher.observe(node);
		return () => watcher.disconnect();
	}, [onSeen]);
	return mark;
}

function useItemSource(items: Items, row: Row<Item>) {
	return useMemo(
		() =>
			valueGateway<Item>({
				id: `${items.id}#${row.ref}`,
				handlers: {
					get: async () => {
						if (!items.get?.can().can) return row.value;
						return (await items.get(row.ref))?.value ?? row.value;
					},
				},
			}),
		[items, row.ref],
	);
}

function FeedSaid({ text }: { text: string }) {
	return <p className="wg-feed-said">{text}</p>;
}

type PagesProps = { items: Items; Drawn: Drawn; size: number; pages: number; onMore: () => void };

function FeedPages({ items, Drawn, size, pages, onMore }: PagesProps) {
	return (
		<div className="wg-feed">
			<style>{CSS}</style>
			<SlotList slot={Drawn}>
				{Array.from({ length: pages }, (_, page) => (
					<FeedPage
						key={page}
						items={items}
						Drawn={Drawn}
						offset={page * size}
						limit={size}
						isLast={page === pages - 1}
						onMore={onMore}
					/>
				))}
			</SlotList>
		</div>
	);
}

type PageProps = { items: Items; Drawn: Drawn; offset: number; limit: number; isLast: boolean; onMore: () => void };

function FeedPage({ items, Drawn, offset, limit, isLast, onMore }: PageProps) {
	const listed = useData(items.list, { offset, limit });
	const hasMore = isLast && listed.data.length === limit && (listed.total ?? 0) > offset + limit;

	return (
		<>
			{listed.data.map((row) => (
				<FeedItem key={row.ref} items={items} row={row as Row<Item>} Drawn={Drawn} />
			))}
			{hasMore ? <MoreWhenSeen onSeen={onMore} /> : null}
		</>
	);
}

function FeedItem({ items, row, Drawn }: { items: Items; row: Row<Item>; Drawn: Drawn }) {
	return <Drawn source={useItemSource(items, row)} />;
}

function MoreWhenSeen({ onSeen }: { onSeen: () => void }) {
	return <div ref={useWhenSeen(onSeen)} className="wg-feed-more" aria-hidden="true" />;
}
