import { NOT_AVAILABLE_ON_HOST } from "./studio-host.js";

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

export const STUDIO_OPENED_ON: StudioMoment = { view: "app", panel: "none" };

const refuseOutsideAStudio = (): never => {
	throw new Error(NOT_AVAILABLE_ON_HOST);
};

export const NO_STUDIO_STATE: StudioState = {
	now: () => STUDIO_OPENED_ON,
	subscribe: () => () => undefined,
	show: refuseOutsideAStudio,
	togglePanel: refuseOutsideAStudio,
	openPanel: refuseOutsideAStudio,
};
