import { pickedValue, type Row } from "widgetarium";
import { textIn } from "./text-in";
import type { RepeatMode } from "./types";
import type { Track } from "./widget";

export type Queue = {
	rows: readonly Row<Track>[];
	at: number;
	track: Row<Track> | null;
	elapsed: number;
	repeatMode: RepeatMode;
};

export function queueOf(
	rows: readonly Row<Track>[],
	playingValue: unknown,
	positionValue: unknown,
	repeatMode: RepeatMode,
) {
	const playingRef: string = pickedValue(playingValue);
	const at = rows.findIndex((row) => row.ref === playingRef);
	const track = at < 0 ? null : (rows[at] ?? null);
	const sought = wholeSecondsIn(positionValue);
	const duration = secondsIn(track?.duration);
	const elapsed = duration === null ? 0 : Math.min(sought, duration);
	return { rows, at, track, duration, elapsed, repeatMode };
}

function secondsIn(value: unknown): number | null {
	const said = textIn(value);
	if (said === null) return null;
	const parts = said.split(":").map((part) => Number(part));
	if (parts.some((part) => !Number.isFinite(part) || part < 0)) return null;
	const seconds = parts.reduce((held, part) => held * 60 + part, 0);
	return seconds > 0 ? Math.round(seconds) : null;
}

function wholeSecondsIn(value: unknown): number {
	const held = Number(value);
	if (!Number.isFinite(held) || held < 0) return 0;
	return Math.round(held);
}
