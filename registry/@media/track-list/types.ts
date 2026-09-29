import { IValueGateway, z, type DrawnProps, type Row as Held, type RecordRef, type Slot } from "widgetarium";
import type { TrackSchema, props } from "./widget";

type TrackRecord = z.infer<typeof TrackSchema>;

export type Given = { track: IValueGateway; position: number; isPlaying: boolean };
export type Tracks = DrawnProps<typeof props>["tracks"];
export type TrackRow = Held<TrackRecord & { ref: RecordRef }>;
export type RowSlot = Slot<Given>;
export type Drawn = NonNullable<RowSlot>;
