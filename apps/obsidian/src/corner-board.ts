export type CornerSide = "left" | "right";

export type Platform = "macos" | "windows" | "web";

export interface CornerPlace {
	readonly side: CornerSide;
	readonly app: string;
	readonly platform: Platform;
	readonly isInCanvas: boolean;
}

type Binding = { readonly implementation: string; readonly fields: Readonly<Record<string, unknown>> };

type Mounted = { readonly name: string; readonly widget: string; readonly props: Readonly<Record<string, Binding>> };

const CORNER_TILE = "corner";

const BUTTON_PX = 34;
const CORNER_GAP_PX = 4;
const WINDOW_EDGE_PX = 4;
const SYSTEM_BUTTONS_PX: Readonly<Record<Platform, Partial<Record<CornerSide, number>>>> = {
	macos: { left: 76 },
	windows: { right: 138 },
	web: {},
};

// TRADE-OFF: the widths repeat the chrome widgets' own, because a board lays itself out by the width it is handed
export function cornerWidthOf(side: CornerSide, platform: Platform): number {
	return (SYSTEM_BUTTONS_PX[platform][side] ?? WINDOW_EDGE_PX) + CORNER_GAP_PX + BUTTON_PX;
}

export function cornerBoardOf(place: CornerPlace): Record<string, unknown> {
	return {
		v: 2,
		tiles: [cornerTileOf(place.side, itemsOf(place))],
		layout: { dir: "row", of: [{ dir: "column", keep: true, of: [{ id: CORNER_TILE, surface: "none" }] }] },
	};
}

function cornerTileOf(side: CornerSide, items: readonly Mounted[]): Record<string, unknown> {
	return {
		id: CORNER_TILE,
		widget: "@chrome/corner",
		props: { getSide: typed(side) },
		mounts: { items: items.map(({ name, widget }) => ({ name, widget })) },
		mounted: Object.fromEntries(items.map(({ name, widget, props }) => [name, { widget, props }])),
	};
}

function itemsOf({ side, app, platform, isInCanvas }: CornerPlace): readonly Mounted[] {
	const safeArea: Mounted = {
		name: "Safe area",
		widget: "@chrome/safe-area",
		props: { getSide: typed(side), getPlatform: typed(platform) },
	};
	if (side === "right") {
		const ai: Mounted = {
			name: "AI button",
			widget: "@chrome/ai-button",
			props: { toggleAssistant: bound("@chrome/toggle-assistant") },
		};
		return [ai, safeArea];
	}
	const menu: Mounted = {
		name: "Control menu",
		widget: "@chrome/control-menu",
		props: {
			getCurrentApp: bound("@chrome/current-app", { app }),
			getApps: bound("@chrome/apps"),
			openApp: bound("@chrome/open-app"),
			createApp: bound("@chrome/create-app"),
			editInCanvas: bound("@chrome/edit-in-canvas", { app }),
			getIsInCanvas: typed(isInCanvas),
			backToView: bound("@chrome/back-to-view", { app }),
		},
	};
	return [safeArea, menu];
}

function bound(implementation: string, fields: Readonly<Record<string, unknown>> = {}): Binding {
	return { implementation, fields };
}

function typed(value: string | boolean): Binding {
	return bound("@core/typed-value", { value });
}
