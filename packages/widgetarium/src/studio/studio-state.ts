export type StudioView = "app" | "canvas";

export interface StudioMoment {
	readonly view: StudioView;
	readonly isAssistantOpen: boolean;
}

export interface StudioState {
	now(): StudioMoment;
	subscribe(changed: () => void): () => void;
	show(view: StudioView): void;
	toggleAssistant(): void;
}

const OPENED_ON: StudioMoment = { view: "app", isAssistantOpen: false };

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
		toggleAssistant: () => become({ ...moment, isAssistantOpen: !moment.isAssistantOpen }, "toggle assistant"),
	};
}
