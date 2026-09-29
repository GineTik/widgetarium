import {
	IListGateway,
	ISlot,
	IValueGateway,
	VaultRecordSchema,
	createWidget,
	defineLayout,
	defineMetadata,
	defineProps,
	useData,
	z,
} from "widgetarium";
import { AlbumPage } from "./album-page";
import { MIN_CELL_PX, NARROW_PX } from "./cell-sizes";
import { MoreWhenSeen, usePages } from "widgetarium/kit";
import type { CoverSlot, Drawn, Given } from "./types";
import { useBeside } from "./use-beside";
import { useNarrowShelf } from "./use-narrow-shelf";

export const AlbumSchema = VaultRecordSchema.extend({
	title: z
		.string()
		.nullable()
		.optional()
		.meta({ aka: ["album", "name"] }),
	artist: z
		.string()
		.nullable()
		.optional()
		.meta({ aka: ["band", "performer", "by"] }),
	cover: z
		.string()
		.nullable()
		.optional()
		.meta({ aka: ["art", "artwork", "image", "sleeve"] }),
	tracks: z
		.number()
		.nullable()
		.optional()
		.meta({ aka: ["trackCount", "songs", "length"] }),
});

const PAGE_SIZE = 24;

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
.wg-albums-said { margin: 0; color: var(--wg-kit-text-muted); }
`;

export const props = defineProps({
	albums: IListGateway.of(AlbumSchema, {
		default: [
			{ title: "Kind of Blue", artist: "Miles Davis", tracks: 5 },
			{ title: "In Rainbows", artist: "Radiohead", tracks: 10 },
			{ title: "Blue Train", artist: "John Coltrane", tracks: 5 },
			{ title: "Rumours", artist: "Fleetwood Mac", tracks: 11 },
			{ title: "Selected Ambient Works 85-92", artist: "Aphex Twin" },
			{ title: "Unmarked tape", tracks: 3 },
		],
	}),
	pageSize: IValueGateway.of(z.number().default(PAGE_SIZE)).pick("get"),
	cover: ISlot.of<Given>({
		default: "@media/album-cover",
		surface: "none",
		gives: { album: ["title", "artist", "cover", "tracks"], beside: [] },
	}),
});

const AlbumGrid = createWidget({
	inject: props,
	draw: ({ albums, pageSize, cover }) => {
		const size = pageSizeOf(pageSize);
		const { shelf, isNarrow } = useNarrowShelf();
		const { pages, more } = usePages(albums.id, size);
		const first = useData(albums.list, { offset: 0, limit: size });
		const beside = useBeside(albums.id, isNarrow);
		const said = saidInstead(cover, first);
		const hasMore = !said && (first.total ?? 0) > pages * size;

		return (
			<div className="wg-albums" ref={shelf} data-narrow={isNarrow ? "" : undefined}>
				<style>{CSS}</style>
				{said ? (
					<p className="wg-albums-said">{said}</p>
				) : (
					<div className="wg-albums-shelf">
						{Array.from({ length: pages }, (_, page) => (
							<AlbumPage
								key={page}
								albums={albums}
								Drawn={cover as Drawn}
								beside={beside}
								offset={page * size}
								limit={size}
							/>
						))}
					</div>
				)}
				{hasMore ? <MoreWhenSeen onSeen={more} className="wg-albums-more" /> : null}
			</div>
		);
	},
});

export const metadata = defineMetadata(AlbumGrid, {
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
		albums: {
			label: "Albums",
			hint: "The records the shelf draws, one cell each.",
			describes: {
				title: { label: "Title", type: "text" },
				artist: { label: "Artist", type: "text" },
				cover: { label: "Cover", type: "text" },
				tracks: { label: "Tracks", type: "number" },
			},
		},
		pageSize: {
			label: "Albums per load",
			hint: "How many more are drawn each time the end of the shelf comes into view.",
		},
	},
});

export const layout = defineLayout({
	role: "collection",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 120, stackBelowPx: NARROW_PX },
});

export default AlbumGrid;

function saidInstead(
	slot: CoverSlot | null | undefined,
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
