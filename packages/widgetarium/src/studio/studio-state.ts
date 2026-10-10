export type StudioView = "app" | "canvas";

export const OPENABLE_PANELS = ["assistant", "catalogue"] as const;

export type OpenablePanel = (typeof OPENABLE_PANELS)[number];

export type StudioPanel = "none" | OpenablePanel;

export interface StudioMoment {
	readonly view: StudioView;
	readonly panel: StudioPanel;
}

export interface StudioState {
	now(): StudioMoment;
	subscribe(changed: () => void): () => void;
	show(view: StudioView): void;
	togglePanel(panel: OpenablePanel): void;
	openPanel(panel: OpenablePanel): void;
}

const OPENED_ON: StudioMoment = { view: "app", panel: "none" };

// TRADE-OFF: one studio per page; two studios on a page would share it
export const STUDIO_STATE = createStudioState();

function createStudioState(): StudioState {
	const listeners = new Set<() => void>();
	let moment = OPENED_ON;
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
