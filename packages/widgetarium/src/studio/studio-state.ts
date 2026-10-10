import { STUDIO_OPENED_ON } from "@widgetarium/core/engine/studio-state-port.js";
import type { StudioMoment, StudioState } from "@widgetarium/core/engine/studio-state-port.js";

export function createStudioState(): StudioState {
	const listeners = new Set<() => void>();
	let moment = STUDIO_OPENED_ON;
	const become = (next: StudioMoment, reason: string): void => {
		console.info(`[widgetarium] studio ${JSON.stringify(moment)} → ${JSON.stringify(next)} (${reason})`);
		moment = next;
		for (const changed of listeners) changed();
	};
	return {
		now: () => moment,
		subscribe: (changed) => {
			listeners.add(changed);
			return () => listeners.delete(changed);
		},
		show: (view) => {
			if (moment.view !== view) become({ ...moment, view }, `show ${view}`);
		},
		togglePanel: (panel) => become({ ...moment, panel: moment.panel === panel ? "none" : panel }, `toggle ${panel}`),
		openPanel: (panel) => {
			if (moment.panel !== panel) become({ ...moment, panel }, `open ${panel}`);
		},
	};
}
