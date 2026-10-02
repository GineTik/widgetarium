import type { Row } from "widgetarium";
import { Icon, IconButton, Pill } from "widgetarium/kit";
import { textIn } from "./text-in";
import type { PlayerProps } from "./types";
import type { Track } from "./widget";

const NOTHING_PLAYING = "Nothing playing";
const IDLE_HINT = "Press play to start with the first track.";
const IDLE_MARK = "Idle";
const UNTITLED = "Untitled track";
const UNKNOWN_ARTIST = "Unknown artist";

type TrackHeadProps = { track: Row<Track> | null; updateTrack: PlayerProps["updateTrack"] };

export function TrackHead({ track, updateTrack }: TrackHeadProps) {
	const canFavourite = updateTrack.can().can && track !== null;
	const isFavourite = track?.favourite === true;
	return (
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
					aria-pressed={isFavourite}
					onClick={() => void updateTrack({ ref: track.ref, favourite: !isFavourite })}
				>
					<Icon name="heart" size={18} />
				</IconButton>
			) : null}
		</div>
	);
}

function titleOf(track: Track | null): string {
	if (!track) return NOTHING_PLAYING;
	return textIn(track.title) ?? textIn(track.name) ?? UNTITLED;
}

function artistOf(track: Track | null): string {
	if (!track) return IDLE_HINT;
	return textIn(track.artist) ?? UNKNOWN_ARTIST;
}
