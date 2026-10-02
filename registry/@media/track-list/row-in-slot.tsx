import { useMemo } from "react";
import type { Drawn, SetTrack, TrackFace, TrackRow, UpdateTrack } from "./types";

export function RowInSlot({
	Drawn,
	updateTrack,
	row,
	position,
	isPlaying,
}: {
	Drawn: Drawn;
	updateTrack: UpdateTrack;
	row: TrackRow;
	position: number;
	isPlaying: boolean;
}) {
	const setTrack = useMemo<SetTrack>(
		() =>
			Object.assign((next: TrackFace) => updateTrack({ ref: row.ref, ...next }), {
				can: () => updateTrack.can(),
			}),
		[updateTrack, row.ref],
	);
	return <Drawn getTrack={faceOf(row)} getPosition={position} getIsPlaying={isPlaying} setTrack={setTrack} />;
}

function faceOf(row: TrackRow): TrackFace {
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
