import type { ReferenceNote } from "../app-design.js";
import type { Job } from "../app-jobs.js";
import type { Board } from "../model.js";
import type { WidgetSurfaceProps } from "../surface/widget-surface.js";
import type { NodeMove } from "./node-moves.js";
import { NO_HOST } from "./host-none.js";
import { NOT_AVAILABLE_ON_HOST } from "./studio-host.js";

export interface StatePicture {
	readonly widget: string;
	readonly props: Readonly<Record<string, unknown>>;
}

export interface DrawnState {
	readonly name: string;
	readonly board: Board | null;
	readonly picture?: StatePicture | undefined;
	readonly refusal?: string | undefined;
	readonly situation?: string | undefined;
}

export interface DrawnScreen {
	readonly name: string;
	readonly states: readonly DrawnState[];
}

export interface DrawnReference {
	readonly name: string;
	readonly src: string;
	readonly why?: string | undefined;
	readonly kind?: string | undefined;
	readonly pages: readonly string[];
	readonly notes: readonly ReferenceNote[];
}

export interface DrawnWidget {
	readonly id: string;
	readonly isFromCatalogue: boolean;
}

export interface DrawnDesign {
	readonly screens: readonly DrawnScreen[];
	readonly references: readonly DrawnReference[];
	readonly widgets: readonly DrawnWidget[];
}

export interface Drawing {
	readonly registry: WidgetSurfaceProps["registry"];
	readonly host: WidgetSurfaceProps["host"];
}

export interface CanvasDoc {
	readonly name: string;
	readonly path: string;
	readonly markdown: string;
}

export interface LiveJob {
	readonly activity: string | null;
	readonly lines: readonly string[];
	readonly spent: number;
}

export interface JobControls {
	readonly live: (id: string) => LiveJob | null;
	readonly stop: (id: string) => void;
}

export interface LayerMove extends NodeMove {
	readonly file: string;
}

export type PictureTaker = (node: HTMLElement, scale: number) => Promise<HTMLCanvasElement>;

export interface DesignPort {
	design(app: string, isStarting: boolean): Promise<DrawnDesign>;
	docs(app: string): Promise<readonly CanvasDoc[]>;
	jobs(app: string): readonly Job[];
	onJobs(changed: () => void): () => void;
	liveJob(app: string, id: string): LiveJob | null;
	stopJob(app: string, id: string): Promise<void>;
	drawing(): Drawing;
	onChanged(app: string, changed: () => void): () => void;
	addPhotos(app: string, photos: readonly File[]): Promise<void>;
	moveLayer(widget: string, move: LayerMove): Promise<void>;
	returnToView(app: string, page: string): Promise<void>;
	readonly pictureOf: PictureTaker | null;
}

const NO_WIDGETS: Drawing["registry"] = { list: () => [], get: () => null, tileRefOf: (id) => id };

const NO_DESIGN_HOST: Drawing["host"] = {
	...NO_HOST,
	can: { catalogue: false, fullscreen: false, subscribe: false, network: false, renderMarkdown: false },
	slot: refuseOffHostNow,
};

export function refusedDesignOf(app: string, refusal: string): DrawnDesign {
	return {
		screens: [{ name: app, states: [{ name: app, board: null, refusal }] }],
		references: [],
		widgets: [],
	};
}

export const NO_DESIGN: DesignPort = {
	design: async (app) => refusedDesignOf(app, NOT_AVAILABLE_ON_HOST),
	docs: async () => [],
	jobs: () => [],
	onJobs: () => () => undefined,
	liveJob: () => null,
	stopJob: refuseOffHost,
	drawing: () => ({ registry: NO_WIDGETS, host: NO_DESIGN_HOST }),
	onChanged: () => () => undefined,
	addPhotos: refuseOffHost,
	moveLayer: refuseOffHost,
	returnToView: refuseOffHost,
	pictureOf: null,
};

function refuseOffHost(): Promise<never> {
	return Promise.reject(new Error(NOT_AVAILABLE_ON_HOST));
}

function refuseOffHostNow(): never {
	throw new Error(NOT_AVAILABLE_ON_HOST);
}
