import type { LooseProps } from "../types";
import { createElement as h } from "react";
import { ProgressCircle } from "./progress-circle";
import { ProgressLine } from "./progress-line";
import { PROGRESS_SHAPES } from "../constants/progress";
import { warnOnce } from "../utils/surface";

function wornWord(asked, offered, what) {
	if (offered.includes(asked)) return asked;
	warnOnce(`${asked} is no ${what}, so ${offered[0]} was drawn instead: ${offered.join(", ")}`);
	return offered[0];
}

export function ProgressBar({ shape = "line", ...props }: LooseProps) {
	if (wornWord(shape, PROGRESS_SHAPES, "progress shape") === "circle") return <ProgressCircle {...props} />;
	return <ProgressLine {...props} />;
}
