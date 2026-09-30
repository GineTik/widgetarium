import { createElement as h } from "react";
import type { ReactElement } from "react";
import { PROGRESS_SHAPES } from "../constants/progress";
import type { ProgressShape } from "../constants/progress";
import type { ToneName } from "../constants/tones";
import type { DisplayValue } from "../utils/progress";
import { wornWord } from "../utils/surface";
import type { WordChoice } from "../utils/surface";
import type { ProgressProps } from "./progress";
import { ProgressCircle } from "./progress-circle";
import { ProgressLine } from "./progress-line";

export interface ProgressBarProps extends ProgressProps {
	readonly shape?: ProgressShape | undefined;
	readonly tone?: ToneName | undefined;
	readonly isWavy?: boolean;
	readonly isControlled?: boolean;
	readonly hasStopMark?: boolean;
	readonly displayValue?: DisplayValue;
	readonly size?: number;
}

const PROGRESS_SHAPE_WORD: WordChoice<ProgressShape> = {
	kind: "progress shape",
	allowed: PROGRESS_SHAPES,
	fallback: "line",
};

export function ProgressBar({ shape = "line", ...props }: ProgressBarProps): ReactElement {
	if (wornWord(shape, PROGRESS_SHAPE_WORD) === "circle") return <ProgressCircle {...props} />;
	return <ProgressLine {...props} />;
}
