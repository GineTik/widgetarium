import type { WidgetSurfaceProps } from "@widgetarium/core/surface/widget-surface.js";
import type { Board } from "@widgetarium/core/model.js";

export const GAP_PX = 120;
export const MARGIN_PX = 80;

export interface DrawnState {
	readonly name: string;
	readonly board: Board | null;
	readonly refusal?: string | undefined;
}

export interface DrawnScreen {
	readonly name: string;
	readonly states: readonly DrawnState[];
}

export interface Size {
	readonly width: number;
	readonly height: number;
}

export interface Frame {
	readonly label: string;
	readonly state: DrawnState;
}

export interface Drawing {
	readonly registry: WidgetSurfaceProps["registry"];
	readonly host: WidgetSurfaceProps["host"];
}
