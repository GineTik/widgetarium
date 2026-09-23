import { useEffect, useMemo, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { createWidget, canDo, defineManifest, defineProp, pickedValue, useData, valueGateway } from "widgetarium";
import type { Row as Held, Ref, VaultRecord, ValueGateway, Slot, WidgetProps } from "widgetarium";
import { Button, Row, RowLabel, RowValue, SlotList } from "widgetarium/kit";

const NARROW_PX = 600;
const PAGE_SIZE = 50;

const NO_SLOT = "This list has no widget to draw its rows with.";
const READING = "Reading…";
const NO_TRACKS = "No tracks here yet.";
const NO_MATCHES = "No track matches the filter.";
const COUNTED_ALL = "{total} tracks in all.";
const CLEAR_THE_FILTER = "Clear the filter";
const SHOW_MORE = "Show {count} more";
const SHOWN_OF_ALL = "{shown} of {total} tracks";
const COUNTED = "{total} tracks";
const TRACKS = "Tracks";
const TITLE_COLUMN = "Title";
const ALBUM_COLUMN = "Album";
const ADDED_COLUMN = "Added";
const TIME_COLUMN = "Time";

const CSS = `
.mt-tracks {
	--mt-w-index: 30px;
	--mt-w-album: 168px;
	--mt-w-added: 104px;
	--mt-w-fav: 36px;
	--mt-w-time: 60px;
	display: flex;
	flex: 1 1 auto;
	flex-direction: column;
	gap: var(--wg-gap-items);
	min-width: 0;
	min-height: 0;
}

/* TRADE-OFF: the kit row's own 12px 16px is dropped and the item plate's inset written back, so the labels stand over the rows rather than 16px inside them */
:is(.wg-root, .wg-portal) .mt-head {
	padding: 0 var(--wg-group-pad);
	color: var(--text-faint);
	font-size: var(--font-ui-smaller);
}

.mt-head .mt-index {
	flex: none;
	width: var(--mt-w-index);
}

:is(.wg-root, .wg-portal) .mt-head .mt-col {
	display: block;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
	color: var(--text-faint);
}

:is(.wg-root, .wg-portal) .mt-head .mt-col-album { width: var(--mt-w-album); }
:is(.wg-root, .wg-portal) .mt-head .mt-col-added { width: var(--mt-w-added); }
:is(.wg-root, .wg-portal) .mt-head .mt-col-fav { width: var(--mt-w-fav); }
:is(.wg-root, .wg-portal) .mt-head .mt-col-time { width: var(--mt-w-time); text-align: right; }

:is(.wg-root, .wg-portal) .mt-head .mt-title {
	font-weight: var(--font-normal);
}

.mt-pick {
	position: relative;
	min-width: 0;
	cursor: pointer;
	border-radius: var(--wg-kit-plate);
}

.mt-pick[data-picked]::before {
	content: "";
	position: absolute;
	inset-block: 25%;
	inset-inline-start: 0;
	width: 3px;
	border-radius: var(--wg-kit-pill);
	background: var(--wg-kit-accent);
}

.mt-pick:focus-visible {
	outline: 2px solid var(--wg-kit-accent);
	outline-offset: 2px;
}

.mt-foot {
	display: flex;
	align-items: center;
	gap: var(--wg-gap-parts);
	color: var(--text-faint);
	font-size: var(--font-ui-smaller);
}

.mt-said {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--wg-gap-parts);
	margin: 0;
	color: var(--wg-kit-text-muted);
}

.mt-said-error { color: var(--text-error); }
.mt-said-faint { color: var(--text-faint); }
.mt-said p { margin: 0; }

@container widget (width < ${NARROW_PX}px) {
	.mt-head { display: none; }
}
`;

type Track = {
	title?: string | null;
	artist?: string | null;
	album?: string | null;
	addedAt?: string | null;
	duration?: string | number | null;
	favourite?: boolean | null;
};

type TrackRecord = VaultRecord & Track;

type ListProps = WidgetProps<typeof manifest>;
type Tracks = ListProps["tracks"];
type TrackRow = Held<TrackRecord & { ref: Ref }>;
type RowSlot = Slot<{ track: ValueGateway<Track>; position: number; isPlaying: boolean }>;
type Drawn = NonNullable<RowSlot>;

export const manifest = defineManifest({
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
	role: "collection",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 220, stackBelowPx: NARROW_PX },
	slots: {
		row: {
			of: "widget",
			default: "@media/track-row",
			surface: "group",
			gives: { track: ["title", "artist", "album", "addedAt", "duration", "favourite"] },
		},
	},
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
		tracks: defineProp<TrackRecord[]>()({
			label: "Tracks",
			hint: "The notes this list draws, one row each. Every field may be missing — a folder of loose recordings is the normal case.",
			default: [],
			writes: ["update"],
			sort: [{ prop: "addedAt", dir: "desc" }],
			describes: {
				title: { label: "Title", type: "text", aka: ["name", "track", "song"] },
				artist: { label: "Artist", type: "text", aka: ["artists", "performer", "by"] },
				album: { label: "Album", type: "text", aka: ["record", "release"] },
				addedAt: { label: "Added", type: "date", aka: ["added", "dateAdded", "created"] },
				duration: { label: "Duration", type: "text", aka: ["length", "time", "runtime"] },
				favourite: { label: "Favourite", type: "boolean", aka: ["favorite", "liked", "starred", "loved"] },
			},
		}),
		selection: defineProp<string>()({
			label: "Selected track",
			hint: "Which track is picked. A player bound to this plays whatever the list picks.",
			of: "tracks",
			writes: ["update"],
		}),
		playing: defineProp<string>()({
			label: "Playing track",
			hint: "Which track is playing now. A player writes it; the row it names wears an equaliser and a heavier title.",
			of: "tracks",
			wants: "@media/player/playing",
		}),
		filter: defineProp<string>()({
			label: "Filter",
			hint: "Only tracks whose title holds these words are listed. Bind a search field and the two move together.",
			default: "",
			writes: ["update"],
			wants: "@default/search-input/value",
		}),
		pageSize: defineProp<number>()({
			label: "Tracks per page",
			hint: "How many rows are read at first, and how many more each press of Show more reads.",
			default: PAGE_SIZE,
		}),
	},
});

export default createWidget(manifest, ({ tracks, selection, playing, filter, pageSize, slots }) => {
	const step = askedSize(useData(pageSize.get).data);
	const [shown, setShown] = useState(step);
	useEffect(() => setShown(step), [step]);

	const asked = String(useData(filter.get).data ?? "").trim();
	const page = useData(tracks.list, { where: whereTitleHolds(asked), limit: shown });
	const everyTrack = useData(tracks.list, { limit: 1 });
	const picked = String(pickedValue(useData(selection.get).data) ?? "");
	const nowPlaying = String(pickedValue(useData(playing.get).data) ?? "");

	const instead = saidInstead({ slot: slots?.row as RowSlot, page, everyTrack, isFiltered: asked !== "" });
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
			<SlotList slot={slots?.row as Drawn}>
				{page.data.map((row, at) => (
					<Pick
						key={String(row.ref)}
						isPicked={String(row.ref) === picked}
						onPick={() => void selection.update(String(row.ref))}
					>
						<RowInSlot
							Drawn={slots?.row as Drawn}
							tracks={tracks}
							row={row as TrackRow}
							position={at + 1}
							isPlaying={String(row.ref) === nowPlaying}
						/>
					</Pick>
				))}
			</SlotList>
			<Foot shown={page.data.length} total={page.total} step={step} onMore={() => setShown(shown + step)} />
		</div>
	);
});

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

function Said({
	text,
	tone,
	count,
	onClear,
}: {
	text: string;
	tone: "muted" | "error" | "faint";
	count: string | null;
	onClear: (() => void) | null;
}) {
	return (
		<div className={tone === "muted" ? "mt-said" : `mt-said mt-said-${tone}`}>
			<style>{CSS}</style>
			<p>{text}</p>
			{count === null ? null : <p>{count}</p>}
			{onClear === null ? null : (
				<Button size="s" onClick={onClear}>
					{CLEAR_THE_FILTER}
				</Button>
			)}
		</div>
	);
}

function Header() {
	return (
		<Row className="mt-head">
			<span className="mt-index" aria-hidden="true" />
			<RowLabel className="mt-title">{TITLE_COLUMN}</RowLabel>
			<RowValue className="mt-col mt-col-album">{ALBUM_COLUMN}</RowValue>
			<RowValue className="mt-col mt-col-added">{ADDED_COLUMN}</RowValue>
			<RowValue className="mt-col mt-col-fav" aria-hidden="true" />
			<RowValue className="mt-col mt-col-time">{TIME_COLUMN}</RowValue>
		</Row>
	);
}

function Pick({ isPicked, onPick, children }: { isPicked: boolean; onPick: () => void; children: ReactNode }) {
	return (
		<div
			className="mt-pick"
			data-picked={isPicked ? "" : undefined}
			aria-current={isPicked ? "true" : undefined}
			aria-label={TRACKS}
			tabIndex={0}
			onClick={onPick}
			onKeyDown={(event: KeyboardEvent) => {
				if (event.key !== "Enter" && event.key !== " ") return;
				event.preventDefault();
				onPick();
			}}
		>
			{children}
		</div>
	);
}

function RowInSlot({
	Drawn,
	tracks,
	row,
	position,
	isPlaying,
}: {
	Drawn: Drawn;
	tracks: Tracks;
	row: TrackRow;
	position: number;
	isPlaying: boolean;
}) {
	return <Drawn track={useTrackSource(tracks, row)} position={position} isPlaying={isPlaying} />;
}

// TRADE-OFF: the row's contents go in the gateway id; one id per ref settles once and never reads the changed note again
function useTrackSource(tracks: Tracks, row: TrackRow): ValueGateway<Track> {
	const face = faceOf(row);
	const stamp = JSON.stringify(face);
	return useMemo(
		() =>
			valueGateway<Track>({
				id: `${tracks.id}#${String(row.ref)}#${stamp}`,
				handlers: {
					get: () => face,
					update: (next: Track) => tracks.update({ ref: row.ref, data: next }),
				},
				cans: { update: () => tracks.update.can() },
				settlesNow: true,
			}),
		[tracks, row.ref, stamp],
	) as ValueGateway<Track>;
}

function Foot({
	shown,
	total,
	step,
	onMore,
}: {
	shown: number;
	total: number | null;
	step: number;
	onMore: () => void;
}) {
	const counted = total === null ? COUNTED.replace("{total}", String(shown)) : saidCount(shown, total);
	const left = total === null ? 0 : total - shown;
	return (
		<div className="mt-foot">
			<span>{counted}</span>
			{left <= 0 ? null : (
				<Button size="s" onClick={onMore}>
					{SHOW_MORE.replace("{count}", String(Math.min(step, left)))}
				</Button>
			)}
		</div>
	);
}

function saidCount(shown: number, total: number): string {
	if (shown >= total) return COUNTED.replace("{total}", String(total));
	return SHOWN_OF_ALL.replace("{shown}", String(shown)).replace("{total}", String(total));
}

function whereTitleHolds(asked: string) {
	return asked === "" ? [] : [{ prop: "title", op: "contains", value: asked }];
}

function askedSize(held: unknown): number {
	const asked = Math.round(Number(held));
	return Number.isFinite(asked) && asked > 0 ? asked : PAGE_SIZE;
}

function faceOf(row: TrackRow): Track {
	return {
		title: said(row.title) === "" ? said(row.name) : said(row.title),
		artist: said(row.artist),
		album: said(row.album),
		addedAt: said(row.addedAt),
		duration: row.duration ?? null,
		favourite: row.favourite === true,
	};
}

function said(held: unknown): string {
	if (held === null || held === undefined) return "";
	return String(held).trim();
}
