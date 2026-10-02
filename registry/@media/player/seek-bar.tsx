import { Progress } from "widgetarium/kit";
import { PERCENT } from "./percent";
import type { PlayerProps } from "./types";

const CLOCK_UNKNOWN = "--:--";

type SeekBarProps = {
	hasTrack: boolean;
	elapsed: number;
	duration: number | null;
	setPosition: PlayerProps["setPosition"];
};

export function SeekBar({ hasTrack, elapsed, duration, setPosition }: SeekBarProps) {
	const canSeek = setPosition.can().can && duration !== null;
	return (
		<div className="wgm-seek">
			<span className="wgm-time">{clockOf(hasTrack ? elapsed : null)}</span>
			<span className="wgm-seek-bar" data-inert={String(!canSeek)}>
				<Progress
					label="Seek"
					value={duration === null ? 0 : (elapsed / duration) * PERCENT}
					onChange={
						canSeek && duration !== null
							? (percent: number) => void setPosition(Math.round((percent / PERCENT) * duration))
							: undefined
					}
				/>
			</span>
			<span className="wgm-time">{clockOf(duration)}</span>
		</div>
	);
}

function clockOf(seconds: number | null): string {
	if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return CLOCK_UNKNOWN;
	const whole = Math.floor(seconds);
	return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}
