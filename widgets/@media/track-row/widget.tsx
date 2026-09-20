import { canDo, createWidget, defineManifest, defineProp, useValue } from "widgetarium";
import type { WidgetProps } from "widgetarium";
import { Icon, IconButton, Row, RowLabel, RowValue } from "widgetarium/kit";

const NARROW_PX = 600;

const UNTITLED = "Untitled";
const PLAYING_NOW = "Playing now";
const ADD_TO_FAVOURITES = "Add to favourites";
const REMOVE_FROM_FAVOURITES = "Remove from favourites";

const CSS = `
/* TRADE-OFF: the slot plate already pads 16px, so the kit row's own 12px 16px is dropped rather than accepted at 28px */
:is(.wg-root, .wg-portal) .mt-row {
	padding: 0;
	min-width: 0;
}

.mt-index {
	display: grid;
	flex: none;
	place-content: center;
	width: var(--mt-w-index, 30px);
	color: var(--text-muted);
	font-variant-numeric: tabular-nums;
}

.mt-name {
	display: flex;
	flex: 1 1 auto;
	flex-direction: column;
	gap: var(--wg-gap-parts);
	min-width: 0;
}

:is(.wg-root, .wg-portal) .mt-row .mt-artist {
	color: var(--text-muted);
	font-size: var(--font-ui-smaller);
	font-weight: var(--font-normal);
}

:is(.wg-root, .wg-portal) .mt-row.is-playing .mt-title {
	color: var(--text-accent);
	font-weight: var(--font-bold);
}

:is(.wg-root, .wg-portal) .mt-row .mt-blank {
	color: var(--text-faint);
}

:is(.wg-root, .wg-portal) .mt-row .mt-col {
	display: block;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

:is(.wg-root, .wg-portal) .mt-row .mt-col-album {
	width: var(--mt-w-album, 168px);
}

:is(.wg-root, .wg-portal) .mt-row .mt-col-added {
	width: var(--mt-w-added, 104px);
}

:is(.wg-root, .wg-portal) .mt-row .mt-col-fav {
	display: inline-flex;
	justify-content: center;
	width: var(--mt-w-fav, 36px);
}

:is(.wg-root, .wg-portal) .mt-row .mt-col-time {
	width: var(--mt-w-time, 60px);
	font-variant-numeric: tabular-nums;
	text-align: right;
}

:is(.wg-root, .wg-portal) .mt-row .mt-fav[data-on] {
	color: var(--text-accent);
}

:is(.wg-root, .wg-portal) .mt-row .mt-fav[data-on] .wg-kit-icon-glyph {
	fill: currentColor;
}

.mt-eq {
	display: flex;
	align-items: flex-end;
	gap: var(--size-2-1, 2px);
	height: 14px;
}

.mt-eq i {
	display: block;
	width: 3px;
	height: 100%;
	border-radius: var(--wg-kit-pill);
	background: var(--wg-kit-accent);
	transform-origin: bottom center;
	animation: mt-eq-bar 900ms ease-in-out infinite alternate;
}

.mt-eq i:nth-child(2) { animation-duration: 640ms; }
.mt-eq i:nth-child(3) { animation-duration: 1180ms; }

@keyframes mt-eq-bar {
	from { transform: scaleY(0.25); }
	to { transform: scaleY(1); }
}

@media (prefers-reduced-motion: reduce) {
	.mt-eq i { animation: none; transform: scaleY(0.45); }
	.mt-eq i:nth-child(2) { transform: scaleY(1); }
}

.mt-break { display: none; }

@container widget (width < ${NARROW_PX}px) {
	:is(.wg-root, .wg-portal) .mt-row {
		flex-wrap: wrap;
		row-gap: var(--wg-gap-parts);
	}

	.mt-row .mt-index { order: 0; }
	.mt-row .mt-name { order: 1; }
	.mt-row .mt-col-fav { order: 2; }
	.mt-row .mt-break { order: 3; display: block; flex: 0 0 100%; height: 0; }
	.mt-row .mt-col-album { order: 4; margin-inline-start: calc(var(--mt-w-index, 30px) + var(--size-4-3, 12px)); }
	.mt-row .mt-col-added { order: 5; }
	.mt-row .mt-col-time { order: 6; }

	:is(.wg-root, .wg-portal) .mt-row .mt-col-time {
		text-align: left;
	}

	:is(.wg-root, .wg-portal) .mt-row .mt-col-album,
	:is(.wg-root, .wg-portal) .mt-row .mt-col-added,
	:is(.wg-root, .wg-portal) .mt-row .mt-col-time {
		width: auto;
		max-width: 100%;
	}
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

export const manifest = defineManifest({
	title: "Track row",
	description:
		"One track as a row: its place, its title over its artist, its album, when it arrived and how long it runs.",
	keywords: [
		"track",
		"row",
		"song",
		"music",
		"audio",
		"library",
		"playlist",
		"album",
		"artist",
		"duration",
		"favourite",
	],
	role: "detail",
	size: { collapseBelowPx: 120, stackBelowPx: NARROW_PX },
	preview: {
		size: { w: 6, h: 1 },
		props: {
			track: {
				value: {
					title: "Weightless",
					artist: "Marconi Union",
					album: "Ambient Transmissions",
					addedAt: "2026-02-11",
					duration: 488,
					favourite: true,
				},
			},
			position: { value: 3 },
		},
	},
	props: {
		track: defineProp<Track>()({
			label: "Track",
			hint: "The track this row draws. Held in a list it is handed down; standing alone it is the one typed here.",
			default: {
				title: "Weightless",
				artist: "Marconi Union",
				album: "Ambient Transmissions",
				addedAt: "2026-02-11",
				duration: 488,
				favourite: false,
			},
			writes: ["update"],
		}),
		position: defineProp<number>()({
			label: "Place in the list",
			hint: "The number drawn where the equaliser stands while the track is playing.",
			default: 0,
		}),
		isPlaying: defineProp<boolean>()({
			label: "Playing",
			hint: "Whether this is the track playing now. The row answers with an equaliser and a heavier title.",
			default: false,
		}),
	},
});

export default createWidget(manifest, ({ track, position, isPlaying }) => {
	const held: Track = useValue(track) ?? {};
	const playing = useValue(isPlaying) === true;
	const at = Number(useValue(position) ?? 0);
	const isFavourite = held.favourite === true;

	return (
		<Row className={playing ? "mt-row is-playing" : "mt-row"}>
			<style>{CSS}</style>

			<span className="mt-index">{playing ? <Equaliser /> : shownPlace(at)}</span>

			<span className="mt-name">
				<RowLabel className={said(held.title) === "" ? "mt-title mt-blank" : "mt-title"}>
					{said(held.title) === "" ? UNTITLED : said(held.title)}
				</RowLabel>
				<RowLabel className="mt-artist">{said(held.artist)}</RowLabel>
			</span>

			<RowValue className="mt-col mt-col-album" title={said(held.album)}>
				{said(held.album)}
			</RowValue>

			<RowValue className="mt-col mt-col-added">{shownDay(held.addedAt)}</RowValue>

			<RowValue className="mt-col mt-col-fav">
				{canDo(track.update) ? (
					<Favourite isOn={isFavourite} onPress={() => favour(track, held, !isFavourite)} />
				) : null}
			</RowValue>

			<RowValue className="mt-col mt-col-time">{shownLength(held.duration)}</RowValue>

			<span className="mt-break" aria-hidden="true" />
		</Row>
	);
});

type RowProps = WidgetProps<typeof manifest>;

function favour(track: RowProps["track"], held: Track, next: boolean) {
	void track.update({ ...held, favourite: next });
}

function Favourite({ isOn, onPress }: { isOn: boolean; onPress: () => void }) {
	return (
		<IconButton
			className="mt-fav"
			size="s"
			variant="ghost"
			data-on={isOn ? "" : undefined}
			aria-pressed={isOn ? "true" : "false"}
			label={isOn ? REMOVE_FROM_FAVOURITES : ADD_TO_FAVOURITES}
			onClick={(event: { stopPropagation(): void }) => {
				event.stopPropagation();
				onPress();
			}}
		>
			<Icon name="heart" size={15} />
		</IconButton>
	);
}

function Equaliser() {
	return (
		<span className="mt-eq" role="img" aria-label={PLAYING_NOW}>
			<i />
			<i />
			<i />
		</span>
	);
}

function said(held: unknown): string {
	if (held === null || held === undefined) return "";
	return String(held).trim();
}

function shownPlace(at: number): string {
	return Number.isFinite(at) && at > 0 ? String(Math.round(at)) : "";
}

function shownLength(held: unknown): string {
	const written = said(held);
	if (written === "") return "";
	const seconds = Number(written);
	if (!Number.isFinite(seconds)) return written;
	const whole = Math.max(0, Math.round(seconds));
	return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function shownDay(held: unknown): string {
	const written = said(held);
	if (written === "") return "";
	const at = new Date(written);
	if (Number.isNaN(at.getTime())) return written;
	return at.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
