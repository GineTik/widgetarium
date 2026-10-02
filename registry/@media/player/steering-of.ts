import type { Queue } from "./queue-of";
import type { PlayerProps, Steering } from "./types";

const RESTART_WITHIN_SECONDS = 3;

export function steeringOf(
	{ rows, at, track, elapsed, repeatMode }: Queue,
	{
		setPlaying,
		setPosition,
		isPlaying,
		setIsPlaying,
		isShuffled,
	}: Pick<PlayerProps, "setPlaying" | "setPosition" | "setIsPlaying"> & { isPlaying: boolean; isShuffled: boolean },
): Steering {
	const loadAt = (index: number) => {
		const row = rows[((index % rows.length) + rows.length) % rows.length];
		if (!row) return;
		void setPlaying(row.ref);
		void setPosition(0);
	};

	const shuffledIndex = () => {
		if (at < 0) return Math.floor(Math.random() * rows.length);
		const drawn = Math.floor(Math.random() * (rows.length - 1));
		return drawn >= at ? drawn + 1 : drawn;
	};

	const toNext = () => {
		if (repeatMode === "one" && track) return void setPosition(0);
		if (isShuffled && rows.length > 1) return loadAt(shuffledIndex());
		if (repeatMode === "off" && at === rows.length - 1) return void setIsPlaying(false);
		loadAt(at + 1);
	};

	const toPrevious = () => {
		if (track && elapsed > RESTART_WITHIN_SECONDS) return void setPosition(0);
		loadAt(at < 0 ? rows.length - 1 : at - 1);
	};

	const togglePlay = () => {
		if (!track) return loadAt(0);
		void setIsPlaying(!isPlaying);
	};

	return { toPrevious, togglePlay, toNext };
}
