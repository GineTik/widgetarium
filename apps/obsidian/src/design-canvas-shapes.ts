import type { WidgetSurfaceProps } from "@widgetarium/core/surface/widget-surface.js";
import type { Board } from "@widgetarium/core/model.js";
import type { ReferenceNote } from "@widgetarium/core/app-design.js";

export const DESKTOP_FRAME = { width: 1280, height: 832 } as const;

export interface StatePicture {
	readonly widget: string;
	readonly props: Readonly<Record<string, unknown>>;
}

export interface DrawnState {
	readonly name: string;
	readonly board: Board | null;
	readonly picture?: StatePicture | undefined;
	readonly refusal?: string | undefined;
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

export interface Size {
	readonly width: number;
	readonly height: number;
}

export interface Drawing {
	readonly registry: WidgetSurfaceProps["registry"];
	readonly host: WidgetSurfaceProps["host"];
}
