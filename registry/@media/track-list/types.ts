import type { CanResult, CommandAnswer, DrawnProps, Row as Held, RecordRef, Slot, z } from "widgetarium";
import type { TrackSchema, props } from "./widget";

type TrackRecord = z.infer<typeof TrackSchema>;

export type TrackFace = {
	title?: string | null;
	artist?: string | null;
	album?: string | null;
	addedAt?: string | null;
	duration?: string | number | null;
	favourite?: boolean | null;
};

export type SetTrack = ((next: TrackFace) => Promise<CommandAnswer>) & { can(): CanResult };

export type Given = { getTrack: TrackFace; getPosition: number; getIsPlaying: boolean; setTrack: SetTrack };
export type UpdateTrack = DrawnProps<typeof props>["updateTrack"];
export type TrackRow = Held<TrackRecord & { ref: RecordRef }>;
export type RowSlot = Slot<Given>;
export type Drawn = NonNullable<RowSlot>;
