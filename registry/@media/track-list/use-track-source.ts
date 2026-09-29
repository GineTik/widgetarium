import { useMemo } from "react";
import { IValueGateway, valueGateway } from "widgetarium";
import type { TrackRow, Tracks } from "./types";

type Track = {
	title?: string | null;
	artist?: string | null;
	album?: string | null;
	addedAt?: string | null;
	duration?: string | number | null;
	favourite?: boolean | null;
};

// TRADE-OFF: the row's contents go in the gateway id; one id per ref settles once and never reads the changed note again
export function useTrackSource(tracks: Tracks, row: TrackRow): IValueGateway {
	const face = faceOf(row);
	const stamp = JSON.stringify(face);
	return useMemo(
		() =>
			valueGateway<Track>({
				id: `${tracks.id}#${String(row.ref)}#${stamp}`,
				handlers: {
					get: () => face,
					update: (next: Track) => tracks.update({ ref: row.ref, data: next }),
				},
				cans: { update: () => tracks.update.can() },
				settlesNow: true,
			}),
		[tracks, row.ref, stamp],
	) as IValueGateway;
}

function faceOf(row: TrackRow): Track {
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
