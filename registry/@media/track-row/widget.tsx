import { ICommand, IQuery, createWidget, defineLayout, defineMetadata, z } from "widgetarium";
import type { PropsOf } from "widgetarium";
import { Row, RowLabel, RowValue } from "widgetarium/kit";
import { Equaliser } from "./equaliser";
import { Favourite } from "./favourite";

const NARROW_PX = 600;

const UNTITLED = "Untitled";

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
	color: var(--wg-kit-text-muted);
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
	color: var(--wg-kit-text-muted);
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

const TrackSchema = z.object({
	title: z.string().nullish(),
	artist: z.string().nullish(),
	album: z.string().nullish(),
	addedAt: z.string().nullish(),
	duration: z.union([z.string(), z.number()]).nullish(),
	favourite: z.boolean().nullish(),
});

type Track = z.infer<typeof TrackSchema>;

const TrackRow = createWidget({
	inject: {
		getTrack: IQuery.expects(
			TrackSchema.default({
				title: "Weightless",
				artist: "Marconi Union",
				album: "Ambient Transmissions",
				addedAt: "2026-02-11",
				duration: 488,
				favourite: false,
			}),
		),
		setTrack: ICommand.sends(TrackSchema),
		getPosition: IQuery.expects(z.number().default(0)),
		getIsPlaying: IQuery.expects(z.boolean().default(false)),
	},
	draw: ({ getTrack: held, setTrack, getPosition: position, getIsPlaying: isPlaying }) => {
		const isFavourite = held.favourite === true;

		return (
			<Row className={isPlaying ? "mt-row is-playing" : "mt-row"}>
				<style>{CSS}</style>

				<span className="mt-index">{isPlaying ? <Equaliser /> : shownPlace(position)}</span>

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
					{setTrack.can().can ? (
						<Favourite isOn={isFavourite} onPress={() => favour(setTrack, held, !isFavourite)} />
					) : null}
				</RowValue>

				<RowValue className="mt-col mt-col-time">{shownLength(held.duration)}</RowValue>

				<span className="mt-break" aria-hidden="true" />
			</Row>
		);
	},
});

export const metadata = defineMetadata(TrackRow, {
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
	preview: {
		size: { w: 6, h: 1 },
		props: {
			getTrack: {
				value: {
					title: "Weightless",
					artist: "Marconi Union",
					album: "Ambient Transmissions",
					addedAt: "2026-02-11",
					duration: 488,
					favourite: true,
				},
			},
			getPosition: { value: 3 },
		},
	},
	props: {
		getTrack: {
			label: "Track",
			aka: ["track"],
			hint: "The track this row draws. Held in a list it is handed down; standing alone it is the one typed here.",
		},
		setTrack: {
			label: "Change the track",
			hint: "Runs when the favourite is pressed, with the whole track as it should now read.",
			source: { implementation: "@core/value-set", fields: { target: "getTrack" } },
		},
		getPosition: {
			label: "Place in the list",
			aka: ["position"],
			hint: "The number drawn where the equaliser stands while the track is playing.",
		},
		getIsPlaying: {
			label: "Playing",
			aka: ["isPlaying"],
			hint: "Whether this is the track playing now. The row answers with an equaliser and a heavier title.",
		},
	},
});

export const layout = defineLayout({
	role: "detail",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 120, stackBelowPx: NARROW_PX },
});

export default TrackRow;

function favour(setTrack: PropsOf<typeof TrackRow>["setTrack"], held: Track, next: boolean) {
	void setTrack({ ...held, favourite: next });
}

function said(held: Track["duration"]): string {
	return String(held ?? "").trim();
}

function shownPlace(at: number): string {
	return Number.isFinite(at) && at > 0 ? String(Math.round(at)) : "";
}

function shownLength(held: Track["duration"]): string {
	const written = said(held);
	if (written === "") return "";
	const seconds = Number(written);
	if (!Number.isFinite(seconds)) return written;
	const whole = Math.max(0, Math.round(seconds));
	return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function shownDay(held: Track["addedAt"]): string {
	const written = said(held);
	if (written === "") return "";
	const at = new Date(written);
	if (Number.isNaN(at.getTime())) return written;
	return at.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
