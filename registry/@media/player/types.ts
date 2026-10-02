import type { PropsOf } from "widgetarium";
import type { REPEAT_MODES } from "./repeat";
import type { PlayerWidget } from "./widget";

export type RepeatMode = (typeof REPEAT_MODES)[number];

export type PlayerProps = PropsOf<typeof PlayerWidget>;

export type Steering = { toPrevious: () => void; togglePlay: () => void; toNext: () => void };
