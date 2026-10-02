import { useEffect, useState } from "react";
import {
	ICommand,
	IQuery,
	ISlot,
	RecordRefSchema,
	VaultRecordSchema,
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
const NEWEST_FIRST = [{ prop: "addedAt", dir: "desc" as const }];

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
	getTracks: IQuery.expects(z.array(TrackSchema)),
	updateTrack: ICommand.sends(TrackSchema.partial().extend({ ref: RecordRefSchema })),
	getSelection: IQuery.expects(z.unknown()),
	select: ICommand.sends(z.unknown()),
	getPlaying: IQuery.expects(z.unknown()),
	getFilter: IQuery.expects(z.string().default("")),
	setFilter: ICommand.sends(z.string()),
	getPageSize: IQuery.expects(z.number().default(PAGE_SIZE)),
	row: ISlot.of<Given>({
		default: "@media/track-row",
		surface: "group",
		gives: { getTrack: ["title", "artist", "album", "addedAt", "duration", "favourite"] },
	}),
});

const TrackList = createWidget({
	inject: props,
	draw: ({
		getTracks,
		updateTrack,
		getSelection: selection,
		select,
		getPlaying: playing,
		getFilter: filter,
		setFilter,
		getPageSize: pageSize,
		row,
	}) => {
		const step = askedSize(pageSize);
		const [shown, setShown] = useState(step);
		useEffect(() => setShown(step), [step]);

		const asked = filter.trim();
		const page = useData(getTracks, { where: whereTitleHolds(asked), sort: NEWEST_FIRST, limit: shown });
		const everyTrack = useData(getTracks, { limit: 1 });
		const picked = pickedValue(selection);
		const nowPlaying = pickedValue(playing);

		const instead = saidInstead({ slot: row, page, everyTrack, isFiltered: asked !== "" });
		if (instead)
			return (
				<Said
					text={instead.text}
					tone={instead.tone}
					count={instead.count}
					onClear={instead.canClear && setFilter.can().can ? () => void setFilter("") : null}
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
							onPick={() => void select(String(entry.ref))}
						>
							<RowInSlot
								Drawn={row as Drawn}
								updateTrack={updateTrack}
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
			getTracks: {
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
		getTracks: {
			label: "Tracks",
			aka: ["tracks"],
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
		updateTrack: {
			label: "Change a track",
			hint: "Runs when a row changes its track, such as a press of its favourite, with the track and what changed.",
			source: { implementation: "@core/rows-update", fields: { target: "getTracks" } },
		},
		getSelection: {
			label: "Selected track",
			aka: ["selection"],
			hint: "Which track is picked. A player bound to this plays whatever the list picks.",
			source: { implementation: "@core/selection", fields: { rows: "getTracks" } },
		},
		select: {
			label: "Pick a track",
			hint: "Runs when a row is pressed, with the track that was pressed.",
			source: { implementation: "@core/value-set", fields: { target: "getSelection" } },
		},
		getPlaying: {
			label: "Playing track",
			aka: ["playing"],
			hint: "Which track is playing now. A player writes it; the row it names wears an equaliser and a heavier title.",
			wants: "@media/player/getPlaying",
			source: { implementation: "@core/selection", fields: { rows: "getTracks" } },
		},
		getFilter: {
			label: "Filter",
			aka: ["filter"],
			hint: "Only tracks whose title holds these words are listed. Bind a search field and the two move together.",
			wants: "@default/search-input/value",
		},
		setFilter: {
			label: "Clear the filter",
			hint: "Runs when Clear the filter is pressed, with the empty words.",
			source: { implementation: "@core/value-set", fields: { target: "getFilter" } },
		},
		getPageSize: {
			label: "Tracks per page",
			aka: ["pageSize"],
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
