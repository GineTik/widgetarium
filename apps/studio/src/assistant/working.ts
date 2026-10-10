import { createElement as h, useEffect, useState } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import type { AssistantSession } from "@widgetarium/core/engine/assistant-port.js";
import { saidProgress } from "./spent.js";

export interface WorkingProps {
	readonly session: AssistantSession;
}

const STILL_BUILDING = "Still building — what you can see is not finished yet.";
const TICK_MS = 1000;

export function Working({ session }: WorkingProps): ReactElement {
	useTicking();
	return h("div", { className: "wg-studio-ai-busy" }, [
		h(Icon, { key: "mark", name: "sparkle", size: 14, className: "wg-studio-ai-busy-mark" }),
		h(
			"span",
			{ className: "wg-studio-ai-busy-said", key: "said" },
			saidProgress({
				ms: session.startedAt ? Date.now() - session.startedAt : 0,
				spent: session.spent,
				phase: session.phase,
				tool: session.tool,
			}),
		),
		h("span", { className: "wg-studio-ai-busy-warn", key: "warn" }, STILL_BUILDING),
	]);
}

function useTicking(): void {
	const [, tick] = useState(0);
	useEffect(() => {
		const timer = setInterval(() => tick((was) => was + 1), TICK_MS);
		return () => clearInterval(timer);
	}, []);
}
