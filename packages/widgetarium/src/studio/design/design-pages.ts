import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import type { Size } from "../canvas/frame-size.js";
import type { Drawing, DrawnScreen } from "./design-canvas-shapes.js";
import { Group } from "./design-group.js";
import { Region } from "./design-region.js";
import { ScreenFrame } from "./design-screen-frame.js";

export interface PagesRegionProps extends Drawing {
	readonly screens: readonly DrawnScreen[];
	readonly size: Size;
	readonly status?: ReactNode;
	readonly aside?: ReactNode;
}

const PAGES = "Pages";
const STATES_SAID = "{count} states";

export function PagesRegion({ screens, size, status, aside, registry, host }: PagesRegionProps): ReactElement | null {
	if (screens.length === 0) return null;
	return h(
		Region,
		{ title: PAGES, count: screens.length, aside },
		screens.map((screen) => screenGroupOf(screen, { size, registry, host }, status ?? null)),
	);
}

export function frameLabelOf(screen: DrawnScreen, state: string): string {
	return screen.states.length < 2 || state === screen.name ? screen.name : `${screen.name} · ${state}`;
}

function screenGroupOf(
	screen: DrawnScreen,
	framing: Omit<PagesRegionProps, "screens" | "status" | "aside">,
	status: ReactNode,
): ReactElement {
	return h(
		Group,
		{
			key: screen.name,
			title: screen.name,
			sub: STATES_SAID.replace("{count}", String(screen.states.length)),
			status,
		},
		screen.states.map((state) =>
			h(ScreenFrame, { key: state.name, label: frameLabelOf(screen, state.name), state, ...framing }),
		),
	);
}
