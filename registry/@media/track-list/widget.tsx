import { useEffect, useState } from "react";
import {
	ICrudGateway,
	ISlot,
	IValueGateway,
	VaultRecordSchema,
	canDo,
	createWidget,
	defineLayout,
	defineMetadata,
	defineProps,
	pickedValue,
	useData,
	z,
} from "widgetarium";
import { SlotList } from "widgetarium/kit";
import { Foot } from "./foot";
import { Header } from "./header";
import { NARROW_PX } from "./narrow";
import { Pick } from "./pick";
import { RowInSlot } from "./row-in-slot";
import { Said } from "./said";
import { CSS } from "./style";
import type { Drawn, Given, RowSlot, TrackRow } from "./types";

const PAGE_SIZE = 50;

const NO_SLOT = "This list has no widget to draw its rows with.";
const READING = "Reading…";
const NO_TRACKS = "No tracks here yet.";
const NO_MATCHES = "No track matches the filter.";
const COUNTED_ALL = "{total} tracks in all.";

export const TrackSchema = VaultRecordSchema.extend({
	title: z
		.string()
		.nullable()
		.optional()
		.meta({ aka: ["name", "track", "song"] }),
	artist: z
		.string()
		.nullable()
		.optional()
		.meta({ aka: ["artists", "performer", "by"] }),
	album: z
		.string()
		.nullable()
		.optional()
		.meta({ aka: ["record", "release"] }),
	addedAt: z
		.string()
		.nullable()
		.optional()
		.meta({ aka: ["added", "dateAdded", "created"] }),
	duration: z
		.union([z.string(), z.number()])
		.nullable()
		.optional()
		.meta({ aka: ["length", "time", "runtime"] }),
	favourite: z
		.boolean()
		.nullable()
		.optional()
		.meta({ aka: ["favorite", "liked", "starred", "loved"] }),
});

export const props = defineProps({
	tracks: ICrudGateway.of(TrackSchema, { sort: [{ prop: "addedAt", dir: "desc" }] }).pick("list", "update"),
	selection: IValueGateway.of(z.unknown()).pick("get", "update"),
	playing: IValueGateway.of(z.unknown()).pick("get"),
	filter: IValueGateway.of(z.string().default("")).pick("get", "update"),
	pageSize: IValueGateway.of(z.number().default(PAGE_SIZE)).pick("get"),
	row: ISlot.of<Given>({
		default: "@media/track-row",
		surface: "group",
		gives: { track: ["title", "artist", "album", "addedAt", "duration", "favourite"] },
	}),
});

const TrackList = createWidget({
	inject: props,
	draw: ({ tracks, selection, playing, filter, pageSize, row }) => {
		const step = askedSize(pageSize);
		const [shown, setShown] = useState(step);
		useEffect(() => setShown(step), [step]);

		const asked = String(filter.value ?? "").trim();
		const page = useData(tracks.list, { where: whereTitleHolds(asked), limit: shown });
		const everyTrack = useData(tracks.list, { limit: 1 });
		const picked = String(pickedValue(selection.value) ?? "");
		const nowPlaying = String(pickedValue(playing) ?? "");

		const instead = saidInstead({ slot: row, page, everyTrack, isFiltered: asked !== "" });
		if (instead)
			return (
				<Said
					text={instead.text}
					tone={instead.tone}
					count={instead.count}
					onClear={instead.canClear && canDo(filter.update) ? () => void filter.update("") : null}
				/>
			);

		return (
			<div className="mt-tracks">
				<style>{CSS}</style>
				<Header />
				<SlotList slot={row as Drawn}>
					{page.data.map((entry, at) => (
						<Pick
							key={String(entry.ref)}
							isPicked={String(entry.ref) === picked}
							onPick={() => void selection.update(String(entry.ref))}
						>
							<RowInSlot
								Drawn={row as Drawn}
								tracks={tracks}
								row={entry as TrackRow}
								position={at + 1}
								isPlaying={String(entry.ref) === nowPlaying}
							/>
						</Pick>
					))}
				</SlotList>
				<Foot shown={page.data.length} total={page.total} step={step} onMore={() => setShown(shown + step)} />
			</div>
		);
	},
});

export const metadata = defineMetadata(TrackList, {
	title: "Track list",
	description:
		"Every track in a folder as a row: its title over its artist, its album, when it arrived, a favourite and how long it runs.",
	keywords: [
		"track",
		"tracks",
		"music",
		"song",
		"songs",
		"audio",
		"library",
		"playlist",
		"album",
		"artist",
		"queue",
		"listen",
		"favourite",
		"duration",
	],
	preview: {
		size: { w: 6, h: 5 },
		props: {
			tracks: {
				rows: [
					{
						path: "music/weightless.md",
						name: "Weightless",
						title: "Weightless",
						artist: "Marconi Union",
						album: "Ambient Transmissions",
						addedAt: "2026-02-11",
						duration: 488,
						favourite: true,
					},
					{
						path: "music/night-drive.md",
						name: "Night Drive",
						title: "Night Drive",
						artist: "Kiasmos",
						addedAt: "2026-01-30",
						duration: 322,
					},
					{
						path: "music/first-light.md",
						name: "First Light",
						title: "First Light",
						artist: "Nils Frahm",
						album: "Spaces",
						addedAt: "2025-12-04",
					},
					{
						path: "music/untitled-demo.md",
						name: "Untitled demo",
						artist: "Hania Rani",
						album: "Home",
						duration: "4:12",
					},
				],
			},
		},
	},
	props: {
		tracks: {
			label: "Tracks",
			hint: "The notes this list draws, one row each. Every field may be missing — a folder of loose recordings is the normal case.",
			describes: {
				title: { label: "Title", type: "text" },
				artist: { label: "Artist", type: "text" },
				album: { label: "Album", type: "text" },
				addedAt: { label: "Added", type: "date" },
				duration: { label: "Duration", type: "text" },
				favourite: { label: "Favourite", type: "boolean" },
			},
		},
		selection: {
			label: "Selected track",
			hint: "Which track is picked. A player bound to this plays whatever the list picks.",
			source: { implementation: "@core/selection", fields: { rows: "tracks" } },
		},
		playing: {
			label: "Playing track",
			hint: "Which track is playing now. A player writes it; the row it names wears an equaliser and a heavier title.",
			wants: "@media/player/playing",
			source: { implementation: "@core/selection", fields: { rows: "tracks" } },
		},
		filter: {
			label: "Filter",
			hint: "Only tracks whose title holds these words are listed. Bind a search field and the two move together.",
			wants: "@default/search-input/value",
		},
		pageSize: {
			label: "Tracks per page",
			hint: "How many rows are read at first, and how many more each press of Show more reads.",
		},
	},
});

export const layout = defineLayout({
	role: "collection",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 220, stackBelowPx: NARROW_PX },
});

export default TrackList;

type Reading = { failure: string | null; isLoading: boolean; total: number | null; data: unknown[] };

type Instead = { text: string; tone: "muted" | "error" | "faint"; canClear: boolean; count: string | null };

function saidInstead({
	slot,
	page,
	everyTrack,
	isFiltered,
}: {
	slot: RowSlot;
	page: Reading;
	everyTrack: Reading;
	isFiltered: boolean;
}): Instead | null {
	if (!slot) return { text: NO_SLOT, tone: "muted", canClear: false, count: null };
	if (page.failure !== null) return { text: page.failure, tone: "error", canClear: false, count: null };
	if (page.isLoading && page.data.length === 0) return { text: READING, tone: "faint", canClear: false, count: null };
	if (page.data.length > 0) return null;
	if (!isFiltered) return { text: NO_TRACKS, tone: "muted", canClear: false, count: null };
	return {
		text: NO_MATCHES,
		tone: "muted",
		canClear: true,
		count: COUNTED_ALL.replace("{total}", String(everyTrack.total ?? 0)),
	};
}

function whereTitleHolds(asked: string) {
	return asked === "" ? [] : [{ prop: "title", op: "contains", value: asked }];
}

function askedSize(held: unknown): number {
	const asked = Math.round(Number(held));
	return Number.isFinite(asked) && asked > 0 ? asked : PAGE_SIZE;
}
