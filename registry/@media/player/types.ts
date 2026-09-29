import type { DrawnProps } from "widgetarium";
import type { REPEAT_MODES } from "./repeat";
import type { PlayerWidget } from "./widget";

export type RepeatMode = (typeof REPEAT_MODES)[number];

export type PlayerProps = DrawnProps<typeof PlayerWidget.declared>;

export type Steering = { toPrevious: () => void; togglePlay: () => void; toNext: () => void };
