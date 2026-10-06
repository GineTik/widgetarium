import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { Drawing, DrawnScreen, Size } from "./design-canvas-shapes.js";
import { Group } from "./design-group.js";
import { Region } from "./design-region.js";
import { ScreenFrame } from "./design-screen-frame.js";

export interface PagesRegionProps extends Drawing {
	readonly screens: readonly DrawnScreen[];
	readonly size: Size;
}

const PAGES = "Pages";
const STATES_SAID = "{count} states";

export function PagesRegion({ screens, size, registry, host }: PagesRegionProps): ReactElement | null {
	if (screens.length === 0) return null;
	return h(
		Region,
		{ title: PAGES, count: screens.length },
		screens.map((screen) =>
			h(
				Group,
				{ key: screen.name, title: screen.name, sub: STATES_SAID.replace("{count}", String(screen.states.length)) },
				screen.states.map((state) =>
					h(ScreenFrame, {
						key: state.name,
						label: frameLabelOf(screen, state.name),
						state,
						size,
						registry,
						host,
					}),
				),
			),
		),
	);
}

function frameLabelOf(screen: DrawnScreen, state: string): string {
	return screen.states.length < 2 || state === screen.name ? screen.name : `${screen.name} · ${state}`;
}
