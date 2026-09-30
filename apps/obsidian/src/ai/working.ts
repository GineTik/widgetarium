import { createElement as h, useEffect, useState } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import { saidProgress } from "./spent.js";
import type { SessionState } from "./session.js";

export interface WorkingProps {
	readonly state: SessionState;
}

const STILL_BUILDING = "Still building — what you can see is not finished yet.";
const TICK_MS = 1000;

export function Working({ state }: WorkingProps): ReactElement {
	useTicking(state.busy);
	return h("div", { className: "wg-ai-busy" }, [
		h(Icon, { key: "mark", name: "sparkle", size: 14, className: "wg-ai-busy-mark" }),
		h(
			"span",
			{ className: "wg-ai-busy-said", key: "said" },
			saidProgress({
				ms: state.startedAt ? Date.now() - state.startedAt : 0,
				spent: state.spent,
				phase: state.phase,
				tool: state.tool,
			}),
		),
		h("span", { className: "wg-ai-busy-warn", key: "warn" }, STILL_BUILDING),
	]);
}

function useTicking(on: boolean): void {
	const [, tick] = useState(0);
	useEffect(() => {
		if (!on) return undefined;
		const timer = setInterval(() => tick((was) => was + 1), TICK_MS);
		return () => clearInterval(timer);
	}, [on]);
}
