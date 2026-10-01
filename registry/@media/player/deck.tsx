import { canDo } from "widgetarium";
import { Icon, IconButton, Progress } from "widgetarium/kit";
import { PERCENT } from "./percent";
import { REPEAT_MODES } from "./repeat";
import type { PlayerProps, RepeatMode, Steering } from "./types";

type DeckProps = Pick<PlayerProps, "isShuffled" | "isPlaying" | "repeat" | "volume"> & {
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
	isPlaying,
	repeat,
	volume,
	canSteer,
	steering: { toPrevious, togglePlay, toNext },
}: DeckProps) {
	const heard = levelIn(volume.value, 0);
	const canHear = canDo(volume.update);
	return (
		<div className="wgm-deck">
			<div className="wgm-transport">
				<IconButton
					variant={isShuffled.value ? "raised" : "ghost"}
					size="m"
					className="wgm-mode"
					label={isShuffled.value ? "Play the queue in order" : "Play the queue shuffled"}
					aria-pressed={isShuffled.value}
					disabled={!canDo(isShuffled.update)}
					onClick={() => void isShuffled.update(!isShuffled.value)}
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
					label={isPlaying.value ? "Pause" : "Play"}
					aria-pressed={isPlaying.value}
					disabled={!canSteer}
					onClick={togglePlay}
				>
					<Icon name={isPlaying.value ? "pause" : "play"} size={24} />
				</IconButton>

				<IconButton variant="ghost" size="m" label="Next track" disabled={!canSteer} onClick={toNext}>
					<Icon name="skip-forward" size={20} />
				</IconButton>

				<IconButton
					variant={repeat.value === "off" ? "ghost" : "raised"}
					size="m"
					className="wgm-mode"
					label={REPEAT_LABELS[repeatAfter(repeat.value)]}
					aria-pressed={repeat.value !== "off"}
					disabled={!canDo(repeat.update)}
					onClick={() => void repeat.update(repeatAfter(repeat.value))}
				>
					<Icon name={REPEAT_ICONS[repeat.value]} size={18} />
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
