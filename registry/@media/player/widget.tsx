import { useState } from "react";
import { canDo, createWidget, defineManifest, defineProp, pickedValue, useData } from "widgetarium";
import { Icon, IconButton, Pill, Progress } from "widgetarium/kit";
import type { VaultRecord } from "widgetarium";

const CSS = `
.wgm-player {
	display: flex;
	align-items: center;
	gap: var(--wg-gap-items);
	min-width: 0;
}

.wgm-cover {
	display: grid;
	flex: none;
	place-items: center;
	overflow: hidden;
	width: 96px;
	height: 96px;
	border-radius: var(--wg-kit-card-corner);
	background: var(--wg-kit-fill);
	color: var(--text-faint);
}

.wgm-cover img {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.wgm-body {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--wg-gap-parts);
	min-width: 0;
}

.wgm-head {
	display: flex;
	align-items: center;
	gap: var(--size-4-2, 8px);
	min-width: 0;
}

.wgm-meta {
	flex: 1;
	min-width: 0;
}

.wgm-title,
.wgm-artist {
	display: block;
	overflow: hidden;
	margin: 0;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.wgm-title {
	font-size: var(--font-ui-medium, 15px);
	font-weight: var(--font-semibold, 600);
	line-height: var(--line-height-tight, 1.25);
}

.wgm-artist {
	font-size: var(--font-ui-small, 14px);
	line-height: var(--line-height-tight, 1.25);
	color: var(--wg-kit-text-muted);
}

.wgm-idle {
	flex: none;
}

.wgm-fav {
	flex: none;
}

.wgm-fav.is-on {
	color: var(--wg-kit-highlight);
}

.wgm-fav.is-on .wg-kit-icon-glyph {
	fill: currentColor;
}

.wgm-deck {
	display: grid;
	align-items: center;
	grid-template-columns: 1fr auto 1fr;
	gap: var(--size-4-2, 8px);
}

.wgm-transport {
	display: flex;
	align-items: center;
	justify-content: center;
	grid-column: 2;
	gap: var(--size-4-2, 8px);
}

.wgm-player .wgm-play-disc::before {
	border-radius: var(--wg-kit-pill);
}

.wgm-volume {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	grid-column: 3;
	gap: var(--size-4-2, 8px);
	min-width: 0;
	color: var(--wg-kit-text-muted);
}

.wgm-volume-bar {
	flex: none;
	width: 96px;
}

.wgm-seek {
	display: flex;
	align-items: center;
	gap: var(--size-4-2, 8px);
	min-width: 0;
}

.wgm-seek-bar {
	flex: 1;
	min-width: 0;
}

.wgm-seek-bar .wg-kit-progress,
.wgm-volume-bar .wg-kit-progress {
	width: 100%;
}

.wgm-player .wg-kit-progress-num {
	display: none;
}

.wgm-time {
	flex: none;
	font-family: var(--font-monospace);
	font-size: var(--font-ui-smaller, 12px);
	color: var(--text-faint);
}

.wgm-player [data-inert="true"] {
	opacity: 0.45;
	pointer-events: none;
}

.wgm-none {
	display: flex;
	align-items: center;
	gap: var(--size-4-2, 8px);
	min-width: 0;
	color: var(--wg-kit-text-muted);
}

.wgm-none-line {
	margin: 0;
	font-size: var(--font-ui-small, 14px);
	line-height: var(--line-height-normal, 1.5);
}

@container widget (width < 520px) {
	.wgm-player .wgm-volume { display: none; }
}

@container widget (width < 420px) {
	.wgm-player .wgm-time { display: none; }
}

@container widget (width < 340px) {
	.wgm-player .wgm-mode { display: none; }

	.wgm-player .wgm-cover {
		width: 56px;
		height: 56px;
	}
}
`;

const QUEUE_CEILING = 300;
const PERCENT = 100;
const RESTART_WITHIN_SECONDS = 3;
const QUIET_VOLUME = 50;
const CLOCK_UNKNOWN = "--:--";
const REMOTE_PICTURE = /^https?:\/\//i;

const EMPTY_QUEUE = "No tracks are bound yet — bind a folder of audio notes and the player draws what stands in it.";
const NOTHING_PLAYING = "Nothing playing";
const IDLE_HINT = "Press play to start with the first track.";
const IDLE_MARK = "Idle";
const UNTITLED = "Untitled track";
const UNKNOWN_ARTIST = "Unknown artist";

type Track = VaultRecord & {
	title?: string | null;
	artist?: string | null;
	album?: string | null;
	cover?: string | null;
	duration?: number | string | null;
	favourite?: boolean | null;
};

const REPEAT_MODES = ["off", "all", "one"] as const;

type RepeatMode = (typeof REPEAT_MODES)[number];

const REPEAT_ICONS: Record<RepeatMode, string> = { off: "repeat", all: "repeat", one: "repeat-1" };

const REPEAT_LABELS: Record<RepeatMode, string> = {
	off: "Stop at the end of the queue",
	all: "Repeat the whole queue",
	one: "Repeat this track",
};

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

function levelIn(value: unknown, fallback: number): number {
	const held = Number(value);
	if (!Number.isFinite(held)) return fallback;
	return Math.max(0, Math.min(PERCENT, Math.round(held)));
}

function wholeSecondsIn(value: unknown): number {
	const held = Number(value);
	if (!Number.isFinite(held) || held < 0) return 0;
	return Math.round(held);
}

function repeatIn(value: unknown): RepeatMode {
	const said = String(value ?? "");
	return REPEAT_MODES.find((mode) => mode === said) ?? "off";
}

function repeatAfter(mode: RepeatMode): RepeatMode {
	return REPEAT_MODES[(REPEAT_MODES.indexOf(mode) + 1) % REPEAT_MODES.length] ?? "off";
}

function volumeIconOf(level: number): string {
	if (level === 0) return "volume-x";
	return level < QUIET_VOLUME ? "volume-1" : "volume-2";
}

function titleOf(track: Track | null): string {
	if (!track) return NOTHING_PLAYING;
	return textIn(track.title) ?? textIn(track.name) ?? UNTITLED;
}

function artistOf(track: Track | null): string {
	if (!track) return IDLE_HINT;
	return textIn(track.artist) ?? UNKNOWN_ARTIST;
}

function Cover({ picture }: { picture: string | null }) {
	const [isBroken, setBroken] = useState(false);
	const isDrawable = picture !== null && REMOTE_PICTURE.test(picture) && !isBroken;
	return (
		<div className="wgm-cover">
			{isDrawable ? (
				<img src={picture} alt="" draggable={false} onError={() => setBroken(true)} />
			) : (
				<Icon name="music-4" size={26} />
			)}
		</div>
	);
}

export const manifest = defineManifest({
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
	role: "composer",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 240, stackBelowPx: 280 },
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
		tracks: defineProp<Track[]>()({
			label: "Tracks",
			hint: "The queue. One note per track, in the order the bound folder is sorted.",
			default: [],
			writes: ["update"],
			describes: {
				title: { label: "Title", type: "text", aka: ["track", "song", "heading"] },
				artist: { label: "Artist", type: "text", aka: ["performer", "band", "author", "by"] },
				album: { label: "Album", type: "text", aka: ["release", "record"] },
				cover: { label: "Cover", type: "text", aka: ["art", "artwork", "image", "thumbnail", "picture"] },
				duration: { label: "Duration", type: "number", aka: ["length", "runtime", "seconds"] },
				favourite: { label: "Favourite", type: "boolean", aka: ["favorite", "loved", "starred", "liked"] },
			},
		}),
		playing: defineProp<string>()({
			label: "Playing",
			hint: "Which track is loaded. Bind a queue beside it and the two move together.",
			of: "tracks",
			default: "",
			writes: ["update"],
		}),
		isPlaying: defineProp<boolean>()({
			label: "Playing state",
			hint: "Whether the transport stands at play or at pause.",
			keep: "screen",
			default: false,
			writes: ["update"],
		}),
		position: defineProp<number>()({
			label: "Position",
			hint: "How far into the track the transport stands, in seconds.",
			keep: "screen",
			default: 0,
			writes: ["update"],
		}),
		volume: defineProp<number>()({
			label: "Volume",
			hint: "The level the transport is set to, from nothing to full.",
			keep: "screen",
			default: 70,
			writes: ["update"],
		}),
		isShuffled: defineProp<boolean>()({
			label: "Shuffle",
			hint: "Whether the next track is the one after this or one drawn at random.",
			keep: "screen",
			default: false,
			writes: ["update"],
		}),
		repeat: defineProp<string>()({
			label: "Repeat",
			hint: "What the end of the queue does: stop, start again, or hold on this track.",
			keep: "screen",
			default: "off",
			writes: ["update"],
		}),
	},
});

export default createWidget(manifest, ({ tracks, playing, isPlaying, position, volume, isShuffled, repeat }) => {
	const listed = useData(tracks.list, { limit: QUEUE_CEILING });
	const rows = listed.data;
	const playingRef: string = pickedValue(useData(playing.get).data);
	const at = rows.findIndex((row) => row.ref === playingRef);
	const track = at < 0 ? null : (rows[at] ?? null);

	const isNowPlaying = useData(isPlaying.get).data === true;
	const heard = levelIn(useData(volume.get).data, 0);
	const sought = wholeSecondsIn(useData(position.get).data);
	const isShuffling = useData(isShuffled.get).data === true;
	const repeatMode = repeatIn(useData(repeat.get).data);

	const duration = secondsIn(track?.duration);
	const elapsed = duration === null ? 0 : Math.min(sought, duration);
	const canSteer = canDo(playing.update) && rows.length > 0;
	const canSeek = canDo(position.update) && duration !== null;
	const canHear = canDo(volume.update);
	const canFavourite = canDo(tracks.update) && track !== null;
	const isFavourite = track?.favourite === true;

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
		if (isShuffling && rows.length > 1) return loadAt(shuffledIndex());
		if (repeatMode === "off" && at === rows.length - 1) return void isPlaying.update(false);
		loadAt(at + 1);
	};

	const toPrevious = () => {
		if (track && elapsed > RESTART_WITHIN_SECONDS) return void position.update(0);
		loadAt(at < 0 ? rows.length - 1 : at - 1);
	};

	const togglePlay = () => {
		if (!track) return loadAt(0);
		void isPlaying.update(!isNowPlaying);
	};

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

				<div className="wgm-deck">
					<div className="wgm-transport">
						<IconButton
							variant={isShuffling ? "raised" : "ghost"}
							size="m"
							className="wgm-mode"
							label={isShuffling ? "Play the queue in order" : "Play the queue shuffled"}
							aria-pressed={String(isShuffling)}
							disabled={!canDo(isShuffled.update)}
							onClick={() => void isShuffled.update(!isShuffling)}
						>
							<Icon name="shuffle" size={18} />
						</IconButton>

						<IconButton variant="ghost" size="m" label="Previous track" disabled={!canSteer} onClick={toPrevious}>
							<Icon name="skip-back" size={20} />
						</IconButton>

						<IconButton
							variant="accent"
							size="l"
							className="wgm-play-disc"
							label={isNowPlaying ? "Pause" : "Play"}
							aria-pressed={String(isNowPlaying)}
							disabled={!canSteer}
							onClick={togglePlay}
						>
							<Icon name={isNowPlaying ? "pause" : "play"} size={24} />
						</IconButton>

						<IconButton variant="ghost" size="m" label="Next track" disabled={!canSteer} onClick={toNext}>
							<Icon name="skip-forward" size={20} />
						</IconButton>

						<IconButton
							variant={repeatMode === "off" ? "ghost" : "raised"}
							size="m"
							className="wgm-mode"
							label={REPEAT_LABELS[repeatAfter(repeatMode)]}
							aria-pressed={String(repeatMode !== "off")}
							disabled={!canDo(repeat.update)}
							onClick={() => void repeat.update(repeatAfter(repeatMode))}
						>
							<Icon name={REPEAT_ICONS[repeatMode]} size={18} />
						</IconButton>
					</div>

					<div className="wgm-volume">
						<Icon name={volumeIconOf(heard)} size={16} />
						<span className="wgm-volume-bar" data-inert={String(!canHear)}>
							<Progress
								label="Volume"
								value={heard}
								onChange={canHear ? (level: number) => void volume.update(level) : undefined}
							/>
						</span>
					</div>
				</div>

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
});
