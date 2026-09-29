import {
	ICrudGateway,
	IValueGateway,
	VaultRecordSchema,
	canDo,
	createWidget,
	defineLayout,
	defineMetadata,
	pickedValue,
	useData,
	z,
	type Row,
} from "widgetarium";
import { Icon, IconButton, Pill, Progress } from "widgetarium/kit";
import { Cover } from "./cover";
import { Deck } from "./deck";
import { PERCENT } from "./percent";
import { repeatIn } from "./repeat";
import { CSS } from "./style";
import type { PlayerProps, RepeatMode, Steering } from "./types";

const QUEUE_CEILING = 300;

const RESTART_WITHIN_SECONDS = 3;

const CLOCK_UNKNOWN = "--:--";

const EMPTY_QUEUE = "No tracks are bound yet — bind a folder of audio notes and the player draws what stands in it.";
const NOTHING_PLAYING = "Nothing playing";
const IDLE_HINT = "Press play to start with the first track.";
const IDLE_MARK = "Idle";
const UNTITLED = "Untitled track";
const UNKNOWN_ARTIST = "Unknown artist";

const TrackSchema = VaultRecordSchema.extend({
	title: z
		.string()
		.nullable()
		.optional()
		.meta({ aka: ["track", "song", "heading"] }),
	artist: z
		.string()
		.nullable()
		.optional()
		.meta({ aka: ["performer", "band", "author", "by"] }),
	album: z
		.string()
		.nullable()
		.optional()
		.meta({ aka: ["release", "record"] }),
	cover: z
		.string()
		.nullable()
		.optional()
		.meta({ aka: ["art", "artwork", "image", "thumbnail", "picture"] }),
	duration: z
		.union([z.number(), z.string()])
		.nullable()
		.optional()
		.meta({ aka: ["length", "runtime", "seconds"] }),
	favourite: z
		.boolean()
		.nullable()
		.optional()
		.meta({ aka: ["favorite", "loved", "starred", "liked"] }),
});

type Track = z.infer<typeof TrackSchema>;

function textIn(value: unknown): string | null {
	if (value === undefined || value === null) return null;
	const said = String(value).trim();
	return said === "" ? null : said;
}

function secondsIn(value: unknown): number | null {
	const said = textIn(value);
	if (said === null) return null;
	const parts = said.split(":").map((part) => Number(part));
	if (parts.some((part) => !Number.isFinite(part) || part < 0)) return null;
	const seconds = parts.reduce((held, part) => held * 60 + part, 0);
	return seconds > 0 ? Math.round(seconds) : null;
}

function clockOf(seconds: number | null): string {
	if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return CLOCK_UNKNOWN;
	const whole = Math.floor(seconds);
	return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function wholeSecondsIn(value: unknown): number {
	const held = Number(value);
	if (!Number.isFinite(held) || held < 0) return 0;
	return Math.round(held);
}

function titleOf(track: Track | null): string {
	if (!track) return NOTHING_PLAYING;
	return textIn(track.title) ?? textIn(track.name) ?? UNTITLED;
}

function artistOf(track: Track | null): string {
	if (!track) return IDLE_HINT;
	return textIn(track.artist) ?? UNKNOWN_ARTIST;
}

export const PlayerWidget = createWidget({
	inject: {
		tracks: ICrudGateway.of(TrackSchema).pick("list", "update"),
		playing: IValueGateway.of(z.unknown().default("")).pick("get", "update"),
		isPlaying: IValueGateway.of(z.boolean().default(false)).pick("get", "update"),
		position: IValueGateway.of(z.number().default(0)).pick("get", "update"),
		volume: IValueGateway.of(z.number().default(70)).pick("get", "update"),
		isShuffled: IValueGateway.of(z.boolean().default(false)).pick("get", "update"),
		repeat: IValueGateway.of(z.string().default("off")).pick("get", "update"),
	},
	draw: ({ tracks, playing, isPlaying, position, volume, isShuffled, repeat }) => {
		const listed = useData(tracks.list, { limit: QUEUE_CEILING });
		const queue = queueOf(listed.data, playing.value, position.value, repeat.value);
		const { rows, track, duration, elapsed } = queue;
		const canSteer = canDo(playing.update) && rows.length > 0;
		const canSeek = canDo(position.update) && duration !== null;
		const canFavourite = canDo(tracks.update) && track !== null;
		const isFavourite = track?.favourite === true;

		const steering = steeringOf(queue, { playing, position, isPlaying, isShuffled });

		if (!listed.isLoading && rows.length === 0)
			return (
				<div className="wgm-none">
					<style>{CSS}</style>
					<Icon name="list-music" size={20} />
					<p className="wgm-none-line">{listed.failure ?? EMPTY_QUEUE}</p>
				</div>
			);

		return (
			<div className="wgm-player">
				<style>{CSS}</style>

				<Cover key={textIn(track?.cover) ?? "none"} picture={textIn(track?.cover)} />

				<div className="wgm-body">
					<div className="wgm-head">
						<div className="wgm-meta">
							<p className="wgm-title">{titleOf(track)}</p>
							<p className="wgm-artist">{artistOf(track)}</p>
						</div>
						{track ? null : <Pill className="wgm-idle">{IDLE_MARK}</Pill>}
						{canFavourite ? (
							<IconButton
								variant="ghost"
								size="m"
								className={isFavourite ? "wgm-fav is-on" : "wgm-fav"}
								label={isFavourite ? "Remove this track from favourites" : "Add this track to favourites"}
								aria-pressed={String(isFavourite)}
								onClick={() => void tracks.update({ ref: track.ref, data: { favourite: !isFavourite } })}
							>
								<Icon name="heart" size={18} />
							</IconButton>
						) : null}
					</div>

					<Deck
						isShuffled={isShuffled}
						isPlaying={isPlaying}
						repeat={repeat}
						volume={volume}
						canSteer={canSteer}
						steering={steering}
					/>

					<div className="wgm-seek">
						<span className="wgm-time">{clockOf(track ? elapsed : null)}</span>
						<span className="wgm-seek-bar" data-inert={String(!canSeek)}>
							<Progress
								label="Seek"
								value={duration === null ? 0 : (elapsed / duration) * PERCENT}
								onChange={
									canSeek && duration !== null
										? (percent: number) => void position.update(Math.round((percent / PERCENT) * duration))
										: undefined
								}
							/>
						</span>
						<span className="wgm-time">{clockOf(duration)}</span>
					</div>
				</div>
			</div>
		);
	},
});

type Queue = {
	rows: readonly Row<Track>[];
	at: number;
	track: Row<Track> | null;
	elapsed: number;
	repeatMode: RepeatMode;
};
function queueOf(rows: readonly Row<Track>[], playingValue: unknown, positionValue: unknown, repeatValue: unknown) {
	const playingRef: string = pickedValue(playingValue);
	const at = rows.findIndex((row) => row.ref === playingRef);
	const track = at < 0 ? null : (rows[at] ?? null);
	const sought = wholeSecondsIn(positionValue);
	const repeatMode = repeatIn(repeatValue);
	const duration = secondsIn(track?.duration);
	const elapsed = duration === null ? 0 : Math.min(sought, duration);
	return { rows, at, track, duration, elapsed, repeatMode };
}

function steeringOf(
	{ rows, at, track, elapsed, repeatMode }: Queue,
	{ playing, position, isPlaying, isShuffled }: Pick<PlayerProps, "playing" | "position" | "isPlaying" | "isShuffled">,
): Steering {
	const loadAt = (index: number) => {
		const row = rows[((index % rows.length) + rows.length) % rows.length];
		if (!row) return;
		void playing.update(row.ref);
		void position.update(0);
	};

	const shuffledIndex = () => {
		if (at < 0) return Math.floor(Math.random() * rows.length);
		const drawn = Math.floor(Math.random() * (rows.length - 1));
		return drawn >= at ? drawn + 1 : drawn;
	};

	const toNext = () => {
		if (repeatMode === "one" && track) return void position.update(0);
		if (isShuffled.value && rows.length > 1) return loadAt(shuffledIndex());
		if (repeatMode === "off" && at === rows.length - 1) return void isPlaying.update(false);
		loadAt(at + 1);
	};

	const toPrevious = () => {
		if (track && elapsed > RESTART_WITHIN_SECONDS) return void position.update(0);
		loadAt(at < 0 ? rows.length - 1 : at - 1);
	};

	const togglePlay = () => {
		if (!track) return loadAt(0);
		void isPlaying.update(!isPlaying.value);
	};

	return { toPrevious, togglePlay, toNext };
}

export const metadata = defineMetadata(PlayerWidget, {
	title: "Player",
	description: "The track playing now, with its cover, its transport and the queue it steps through.",
	keywords: [
		"player",
		"audio",
		"music",
		"track",
		"song",
		"playlist",
		"queue",
		"transport",
		"play",
		"pause",
		"seek",
		"shuffle",
		"repeat",
		"volume",
		"favourite",
		"podcast",
	],
	preview: {
		size: { w: 6, h: 2 },
		props: {
			tracks: {
				rows: [
					{ path: "Music/Riverbed.md", name: "Riverbed", artist: "Hana Okabe", duration: 231, favourite: true },
					{ path: "Music/Low Tide.md", name: "Low Tide", artist: "Hana Okabe", duration: 198 },
					{ path: "Music/Glasshouse.md", name: "Glasshouse", artist: "Vera Nilsen", duration: 274 },
				],
			},
			playing: { value: "i0" },
			isPlaying: { value: true },
			position: { value: 74 },
			volume: { value: 70 },
		},
	},
	props: {
		tracks: {
			label: "Tracks",
			hint: "The queue. One note per track, in the order the bound folder is sorted.",
			describes: {
				title: { label: "Title", type: "text" },
				artist: { label: "Artist", type: "text" },
				album: { label: "Album", type: "text" },
				cover: { label: "Cover", type: "text" },
				duration: { label: "Duration", type: "number" },
				favourite: { label: "Favourite", type: "boolean" },
			},
		},
		playing: {
			label: "Playing",
			hint: "Which track is loaded. Bind a queue beside it and the two move together.",
			source: { implementation: "@core/selection", fields: { rows: "tracks" } },
		},
		isPlaying: {
			keep: "screen",
			label: "Playing state",
			hint: "Whether the transport stands at play or at pause.",
		},
		position: {
			keep: "screen",
			label: "Position",
			hint: "How far into the track the transport stands, in seconds.",
		},
		volume: {
			keep: "screen",
			label: "Volume",
			hint: "The level the transport is set to, from nothing to full.",
		},
		isShuffled: {
			keep: "screen",
			label: "Shuffle",
			hint: "Whether the next track is the one after this or one drawn at random.",
		},
		repeat: {
			keep: "screen",
			label: "Repeat",
			hint: "What the end of the queue does: stop, start again, or hold on this track.",
		},
	},
});

export const layout = defineLayout({
	role: "composer",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 240, stackBelowPx: 280 },
});

export default PlayerWidget;
