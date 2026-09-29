import type { Drawn, TrackRow, Tracks } from "./types";
import { useTrackSource } from "./use-track-source";

export function RowInSlot({
	Drawn,
	tracks,
	row,
	position,
	isPlaying,
}: {
	Drawn: Drawn;
	tracks: Tracks;
	row: TrackRow;
	position: number;
	isPlaying: boolean;
}) {
	return <Drawn track={useTrackSource(tracks, row)} position={position} isPlaying={isPlaying} />;
}
