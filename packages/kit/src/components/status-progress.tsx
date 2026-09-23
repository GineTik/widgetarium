import type { LooseProps } from "../types";
import { createElement as h } from "react";
import { ProgressBar } from "./progress-bar";
import { DONE_ICON_PX, STATUS_TONES } from "../constants/progress";
import { Icon } from "../icons/icon";
import { cx } from "../utils/cx";
import { clampPercent, progressState } from "../utils/progress";

function tickWhenDone({ state }) {
	if (state !== "done") return null;
	return <Icon name="tick" size={DONE_ICON_PX} />;
}

export function StatusProgress({ value = 0, tones, displayValue, className: cls, ...rest }: LooseProps) {
	const shown = clampPercent(value);
	const state = progressState(shown);
	return (
		<ProgressBar
			{...rest}
			value={shown}
			tone={{ ...STATUS_TONES, ...tones }[state]}
			displayValue={displayValue ?? tickWhenDone}
			className={cx("wg-kit-status", `is-${state}`, cls)}
		/>
	);
}
