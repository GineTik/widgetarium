import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { DONE_ICON_PX, STATUS_TONES } from "../constants/progress";
import type { ProgressState } from "../constants/progress";
import type { ToneName } from "../constants/tones";
import { Icon } from "../icons/icon";
import { cn } from "../utils/cn";
import { clampPercent, progressState } from "../utils/progress";
import type { ProgressReading } from "../utils/progress";
import { ProgressBar } from "./progress-bar";
import type { ProgressBarProps } from "./progress-bar";

export interface StatusProgressProps extends Omit<ProgressBarProps, "tone"> {
	readonly tones?: Partial<Record<ProgressState, ToneName>> | undefined;
}

export function StatusProgress({
	value = 0,
	tones,
	displayValue,
	className: cls,
	...rest
}: StatusProgressProps): ReactElement {
	const shown = clampPercent(value);
	const state = progressState(shown);
	return (
		<ProgressBar
			{...rest}
			value={shown}
			tone={tones?.[state] ?? STATUS_TONES[state]}
			displayValue={displayValue ?? tickWhenDone}
			className={cn("wg-kit-status", `is-${state}`, cls)}
		/>
	);
}

function tickWhenDone({ state }: ProgressReading): ReactNode {
	if (state !== "done") return null;
	return <Icon name="tick" size={DONE_ICON_PX} />;
}
