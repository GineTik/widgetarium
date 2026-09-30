import { IHost, IValueGateway, createWidget, defineLayout, defineMetadata, z } from "widgetarium";
import { Art } from "./art";
import type { Album } from "./types";

const UNTITLED = "Untitled album";
const ONE_TRACK = "1 track";
const MANY_TRACKS = "{count} tracks";
const BETWEEN_PARTS = " · ";

const CSS = `
.wg-album { display: flex; flex-direction: column; gap: var(--wg-gap-parts); min-width: 0; }
.wg-album.is-beside { flex-direction: row; align-items: center; gap: var(--wg-gap-items); }

.wg-album-art {
	overflow: hidden;
	flex: none;
	width: 100%;
	aspect-ratio: 1 / 1;
	border-radius: var(--wg-kit-plate);
	background: var(--wg-kit-fill);
}

.wg-album.is-beside .wg-album-art { width: 56px; border-radius: var(--wg-kit-item); }

.wg-album-art img { display: block; width: 100%; height: 100%; object-fit: cover; }
.wg-album-art .internal-embed { display: block; width: 100%; height: 100%; }
.wg-album-art p { margin: 0; }

.wg-album-text { display: flex; flex-direction: column; min-width: 0; }

.wg-album-title {
	overflow: hidden;
	margin: 0;
	white-space: nowrap;
	text-overflow: ellipsis;
	font-size: var(--font-ui-small, 14px);
	font-weight: var(--font-semibold, 600);
	line-height: var(--line-height-tight, 1.25);
}

.wg-album-meta {
	overflow: hidden;
	min-height: calc(var(--font-ui-smaller, 12px) * var(--line-height-tight, 1.25));
	margin: 0;
	white-space: nowrap;
	text-overflow: ellipsis;
	font-size: var(--font-ui-smaller, 12px);
	line-height: var(--line-height-tight, 1.25);
	color: var(--text-faint);
}

`;

export const AlbumSchema = z.object({
	title: z.string().nullish(),
	artist: z.string().nullish(),
	cover: z.string().nullish(),
	tracks: z.union([z.number(), z.string()]).nullish(),
});

const AlbumCover = createWidget({
	inject: {
		album: IValueGateway.of(AlbumSchema.default({ title: "In Rainbows", artist: "Radiohead", tracks: 10 })).pick("get"),
		beside: IValueGateway.of(z.boolean().default(false)).pick("get"),
		host: IHost,
	},
	draw: ({ album, beside, host }) => {
		return (
			<div className={beside ? "wg-album is-beside" : "wg-album"}>
				<style>{CSS}</style>
				<Art album={album} host={host} />
				<div className="wg-album-text">
					<p className="wg-album-title">{titleOf(album)}</p>
					<p className="wg-album-meta">{metaOf(album)}</p>
				</div>
			</div>
		);
	},
});

export const metadata = defineMetadata(AlbumCover, {
	title: "Album cover",
	description: "One album as a cover: the art, the title beneath it and the artist with the track count under that.",
	keywords: [
		"album",
		"cover",
		"art",
		"artwork",
		"sleeve",
		"record",
		"music",
		"artist",
		"band",
		"tracks",
		"listening",
		"media",
	],
	preview: {
		size: { w: 2, h: 3 },
		props: { album: { value: { title: "Kind of Blue", artist: "Miles Davis", tracks: 5 } } },
	},
	props: {
		album: {
			label: "Album",
			hint: "The album this cover draws. Held in a shelf it is handed down; standing alone it is the one typed here.",
		},
		beside: {
			label: "Art beside the text",
			hint: "On, the art stands on the leading edge with the title and artist beside it rather than beneath.",
		},
	},
});

export const layout = defineLayout({
	role: "media",
	size: { preferredWidth: 180, preferredHeight: "auto", collapseBelowPx: 60, stackBelowPx: 120 },
});

export default AlbumCover;

function titleOf(album: Album): string {
	const written = String(album.title ?? "").trim();
	return written === "" ? UNTITLED : written;
}

function metaOf(album: Album): string {
	const artist = String(album.artist ?? "").trim();
	const tracks = countOf(album.tracks);
	return [artist, tracks].filter((part) => part !== "").join(BETWEEN_PARTS);
}

function countOf(value: Album["tracks"]): string {
	const held = Math.round(Number(value));
	if (!Number.isFinite(held) || held <= 0) return "";
	return held === 1 ? ONE_TRACK : MANY_TRACKS.replace("{count}", String(held));
}
