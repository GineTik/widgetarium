import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createWidget, defineManifest, defineProp, useData, valueGateway } from "widgetarium";
import type { Aka, Row, Slot, Text, ValueGateway, VaultRecord, WidgetProps } from "widgetarium";

type Album = VaultRecord & {
	title?: (Text & Aka<"album" | "name">) | null;
	artist?: (Text & Aka<"band" | "performer" | "by">) | null;
	cover?: (Text & Aka<"art" | "artwork" | "image" | "sleeve">) | null;
	tracks?: (number & Aka<"trackCount" | "songs" | "length">) | null;
};

type GridProps = WidgetProps<typeof manifest>;
type Albums = GridProps["albums"];
type CoverSlot = Slot<{ album: ValueGateway<Album>; beside: ValueGateway<boolean> }>;
type Drawn = NonNullable<CoverSlot>;

const PAGE_SIZE = 24;
const MIN_CELL_PX = 140;
const CELL_GAP_ALLOWANCE_PX = 20;
const NARROW_PX = MIN_CELL_PX * 2 + CELL_GAP_ALLOWANCE_PX;
const LOAD_AHEAD = "400px 0px";

const NO_SLOT = "This shelf has no widget to draw its albums with.";
const NOTHING = "No albums here yet.";

const CSS = `
.wg-albums { display: flex; flex-direction: column; flex: 1 1 auto; min-width: 0; min-height: 0; overflow: auto; }

.wg-albums-shelf {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(${MIN_CELL_PX}px, 1fr));
	align-items: start;
	gap: var(--wg-gap-items);
}

.wg-albums[data-narrow] .wg-albums-shelf { grid-template-columns: 1fr; }
.wg-albums-more { flex: none; height: 1px; }
.wg-albums-said { margin: 0; color: var(--text-muted); }
`;

export const manifest = defineManifest({
	title: "Album grid",
	description: "A shelf of albums as equal cells, each drawn by the widget in its slot, wrapping as the shelf widens.",
	keywords: [
		"album",
		"albums",
		"grid",
		"shelf",
		"gallery",
		"covers",
		"artwork",
		"music",
		"records",
		"library",
		"listening",
		"media",
	],
	role: "collection",
	size: { collapseBelowPx: 120, stackBelowPx: NARROW_PX },
	slots: {
		cover: {
			of: "widget",
			default: "@media/album-cover",
			surface: "none",
			gives: { album: ["title", "artist", "cover", "tracks"], beside: [] },
		},
	},
	preview: {
		size: { w: 5, h: 4 },
		props: {
			albums: {
				rows: [
					{ title: "Kind of Blue", artist: "Miles Davis", tracks: 5 },
					{ title: "In Rainbows", artist: "Radiohead", tracks: 10 },
					{ title: "Blue Train", artist: "John Coltrane", tracks: 5 },
					{ title: "Rumours", artist: "Fleetwood Mac", tracks: 11 },
					{ title: "Selected Ambient Works 85-92", artist: "Aphex Twin" },
					{ title: "Unmarked tape", tracks: 3 },
				],
			},
		},
	},
	props: {
		albums: defineProp<Album[]>()({
			label: "Albums",
			hint: "The records the shelf draws, one cell each.",
			default: [
				{ title: "Kind of Blue", artist: "Miles Davis", tracks: 5 },
				{ title: "In Rainbows", artist: "Radiohead", tracks: 10 },
				{ title: "Blue Train", artist: "John Coltrane", tracks: 5 },
				{ title: "Rumours", artist: "Fleetwood Mac", tracks: 11 },
				{ title: "Selected Ambient Works 85-92", artist: "Aphex Twin" },
				{ title: "Unmarked tape", tracks: 3 },
			],
			describes: {
				title: { label: "Title", type: "text", aka: ["album", "name"] },
				artist: { label: "Artist", type: "text", aka: ["band", "performer", "by"] },
				cover: { label: "Cover", type: "text", aka: ["art", "artwork", "image", "sleeve"] },
				tracks: { label: "Tracks", type: "number", aka: ["trackCount", "songs", "length"] },
			},
		}),
		pageSize: defineProp<number>()({
			label: "Albums per load",
			hint: "How many more are drawn each time the end of the shelf comes into view.",
			default: PAGE_SIZE,
		}),
	},
});

export default createWidget(manifest, ({ albums, pageSize, slots }) => {
	const size = usePageSize(pageSize);
	const { shelf, isNarrow } = useNarrowShelf();
	const { pages, more } = usePages(albums.id, size);
	const first = useData(albums.list, { offset: 0, limit: size });
	const beside = useBeside(albums.id, isNarrow);
	const Drawn = slots?.cover as Drawn;
	const said = saidInstead(slots?.cover, first);
	const hasMore = !said && (first.total ?? 0) > pages * size;

	return (
		<div className="wg-albums" ref={shelf} data-narrow={isNarrow ? "" : undefined}>
			<style>{CSS}</style>
			{said ? (
				<p className="wg-albums-said">{said}</p>
			) : (
				<div className="wg-albums-shelf">
					{Array.from({ length: pages }, (_, page) => (
						<AlbumPage key={page} albums={albums} Drawn={Drawn} beside={beside} offset={page * size} limit={size} />
					))}
				</div>
			)}
			{hasMore ? <MoreWhenSeen onSeen={more} /> : null}
		</div>
	);
});

function saidInstead(
	slot: CoverSlot | undefined,
	first: { failure: string | null; isLoading: boolean; total: number | null },
) {
	if (!slot) return NO_SLOT;
	if (first.failure) return first.failure;
	return !first.isLoading && first.total === 0 ? NOTHING : null;
}

function usePageSize(pageSize: GridProps["pageSize"]) {
	const asked = Math.round(Number(useData(pageSize.get).data));
	return asked > 0 ? asked : PAGE_SIZE;
}

function usePages(source: string, size: number) {
	const [pages, setPages] = useState(1);
	const more = useCallback(() => setPages((held) => held + 1), []);
	useEffect(() => setPages(1), [source, size]);
	return { pages, more };
}

function useNarrowShelf() {
	const shelf = useRef<HTMLDivElement>(null);
	const [isNarrow, setNarrow] = useState(false);

	useEffect(() => {
		const node = shelf.current;
		if (!node) return undefined;
		const watcher = new ResizeObserver((entries) => {
			const width = entries[0]?.contentRect.width;
			if (width !== undefined && width > 0) setNarrow(width < NARROW_PX);
		});
		watcher.observe(node);
		return () => watcher.disconnect();
	}, []);

	return { shelf, isNarrow };
}

function useBeside(source: string, isNarrow: boolean) {
	return useMemo(
		() =>
			valueGateway<boolean>({
				id: `${source}#beside=${isNarrow}`,
				handlers: { get: () => isNarrow },
				settlesNow: true,
			}),
		[source, isNarrow],
	);
}

function useAlbumSource(albums: Albums, row: Row<Album>) {
	return useMemo(
		() =>
			valueGateway<Album>({
				id: `${albums.id}#${row.ref}`,
				handlers: { get: async () => (await albums.get(row.ref)) ?? row },
				subscribe: albums.subscribe,
			}),
		[albums, row.ref],
	);
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

type PageProps = { albums: Albums; Drawn: Drawn; beside: ValueGateway<boolean>; offset: number; limit: number };

function AlbumPage({ albums, Drawn, beside, offset, limit }: PageProps) {
	const listed = useData(albums.list, { offset, limit });
	return (
		<>
			{listed.data.map((row) => (
				<AlbumCell key={row.ref} albums={albums} row={row as Row<Album>} Drawn={Drawn} beside={beside} />
			))}
		</>
	);
}

type CellProps = { albums: Albums; row: Row<Album>; Drawn: Drawn; beside: ValueGateway<boolean> };

function AlbumCell({ albums, row, Drawn, beside }: CellProps) {
	return <Drawn album={useAlbumSource(albums, row)} beside={beside} />;
}

function MoreWhenSeen({ onSeen }: { onSeen: () => void }) {
	return <div ref={useWhenSeen(onSeen)} className="wg-albums-more" aria-hidden="true" />;
}
