import { useEffect, useRef, useState } from "react";
import { createWidget, defineManifest, defineProp, useData } from "widgetarium";
import type { ViewHost } from "widgetarium";
import { PlaceholderMark } from "widgetarium/kit";

type Album = {
	title?: string | null;
	artist?: string | null;
	cover?: string | null;
	tracks?: number | string | null;
};

const UNTITLED = "Untitled album";
const ONE_TRACK = "1 track";
const MANY_TRACKS = "{count} tracks";
const BETWEEN_PARTS = " · ";

const WEB_ADDRESS = /^(?:https?:|data:)/i;
const ALREADY_AN_EMBED = /^!\[\[.+\]\]$/;

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

.wg-album-said { margin: 0; font-size: var(--font-ui-smaller, 12px); color: var(--text-muted); }
`;

export const manifest = defineManifest({
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
	role: "media",
	size: { collapseBelowPx: 60, stackBelowPx: 120 },
	preview: {
		size: { w: 2, h: 3 },
		props: { album: { value: { title: "Kind of Blue", artist: "Miles Davis", tracks: 5 } } },
	},
	props: {
		album: defineProp<Album>()({
			label: "Album",
			hint: "The album this cover draws. Held in a shelf it is handed down; standing alone it is the one typed here.",
			default: { title: "In Rainbows", artist: "Radiohead", tracks: 10 },
		}),
		beside: defineProp<boolean>()({
			label: "Art beside the text",
			hint: "On, the art stands on the leading edge with the title and artist beside it rather than beneath.",
			default: false,
		}),
	},
});

export default createWidget(manifest, ({ album, beside, host }) => {
	const read = useData(album.get);
	const held: Album = read.data ?? {};
	const isBeside = useData(beside.get).data === true;

	if (read.failure) return <p className="wg-album-said">{read.failure}</p>;

	return (
		<div className={isBeside ? "wg-album is-beside" : "wg-album"}>
			<style>{CSS}</style>
			<Art album={held} host={host} isLoading={read.isLoading} />
			<div className="wg-album-text">
				<p className="wg-album-title">{titleOf(held)}</p>
				<p className="wg-album-meta">{metaOf(held)}</p>
			</div>
		</div>
	);
});

function Art({ album, host, isLoading }: { album: Album; host: ViewHost; isLoading: boolean }) {
	const written = String(album.cover ?? "").trim();
	const [hasFailed, setFailed] = useState(false);

	if (isLoading) return <div className="wg-album-art" />;
	if (written && !hasFailed && WEB_ADDRESS.test(written))
		return (
			<div className="wg-album-art">
				<img src={written} alt="" draggable={false} onError={() => setFailed(true)} />
			</div>
		);
	if (written && !hasFailed && host?.can?.renderMarkdown) return <Embedded markdown={embedOf(written)} host={host} />;
	return (
		<div className="wg-album-art">
			<PlaceholderMark seed={album.title ?? ""} />
		</div>
	);
}

function Embedded({ markdown, host }: { markdown: string; host: ViewHost }) {
	const holder = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const node = holder.current;
		if (!node) return undefined;
		return host.ui.renderMarkdown(node, markdown);
	}, [host, markdown]);

	return <div className="wg-album-art" ref={holder} />;
}

const embedOf = (written: string) => (ALREADY_AN_EMBED.test(written) ? written : `![[${written}]]`);

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
