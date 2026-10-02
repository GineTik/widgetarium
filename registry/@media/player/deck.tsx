import { Icon, IconButton, Progress } from "widgetarium/kit";
import { PERCENT } from "./percent";
import { REPEAT_MODES } from "./repeat";
import type { PlayerProps, RepeatMode, Steering } from "./types";

type DeckProps = Pick<PlayerProps, "setIsShuffled" | "setRepeat" | "setVolume"> & {
	isShuffled: boolean;
	isPlaying: boolean;
	repeat: RepeatMode;
	volume: number;
	canSteer: boolean;
	steering: Steering;
};

const QUIET_VOLUME = 50;

const REPEAT_ICONS: Record<RepeatMode, string> = { off: "repeat", all: "repeat", one: "repeat-1" };

const REPEAT_LABELS: Record<RepeatMode, string> = {
	off: "Stop at the end of the queue",
	all: "Repeat the whole queue",
	one: "Repeat this track",
};

export function Deck({
	isShuffled,
	setIsShuffled,
	isPlaying,
	repeat,
	setRepeat,
	volume,
	setVolume,
	canSteer,
	steering: { toPrevious, togglePlay, toNext },
}: DeckProps) {
	const heard = levelIn(volume, 0);
	const canHear = setVolume.can().can;
	return (
		<div className="wgm-deck">
			<div className="wgm-transport">
				<IconButton
					variant={isShuffled ? "raised" : "ghost"}
					size="m"
					className="wgm-mode"
					label={isShuffled ? "Play the queue in order" : "Play the queue shuffled"}
					aria-pressed={isShuffled}
					disabled={!setIsShuffled.can().can}
					onClick={() => void setIsShuffled(!isShuffled)}
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
					label={isPlaying ? "Pause" : "Play"}
					aria-pressed={isPlaying}
					disabled={!canSteer}
					onClick={togglePlay}
				>
					<Icon name={isPlaying ? "pause" : "play"} size={24} />
				</IconButton>

				<IconButton variant="ghost" size="m" label="Next track" disabled={!canSteer} onClick={toNext}>
					<Icon name="skip-forward" size={20} />
				</IconButton>

				<IconButton
					variant={repeat === "off" ? "ghost" : "raised"}
					size="m"
					className="wgm-mode"
					label={REPEAT_LABELS[repeatAfter(repeat)]}
					aria-pressed={repeat !== "off"}
					disabled={!setRepeat.can().can}
					onClick={() => void setRepeat(repeatAfter(repeat))}
				>
					<Icon name={REPEAT_ICONS[repeat]} size={18} />
				</IconButton>
			</div>

			<div className="wgm-volume">
				<Icon name={volumeIconOf(heard)} size={16} />
				<span className="wgm-volume-bar" data-inert={String(!canHear)}>
					<Progress
						label="Volume"
						value={heard}
						onChange={canHear ? (level: number) => void setVolume(level) : undefined}
					/>
				</span>
			</div>
		</div>
	);
}

function levelIn(value: unknown, fallback: number): number {
	const held = Number(value);
	if (!Number.isFinite(held)) return fallback;
	return Math.max(0, Math.min(PERCENT, Math.round(held)));
}

function repeatAfter(mode: RepeatMode): RepeatMode {
	return REPEAT_MODES[(REPEAT_MODES.indexOf(mode) + 1) % REPEAT_MODES.length] ?? "off";
}

function volumeIconOf(level: number): string {
	if (level === 0) return "volume-x";
	return level < QUIET_VOLUME ? "volume-1" : "volume-2";
}
