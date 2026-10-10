type Binding = { readonly implementation: string; readonly fields: Readonly<Record<string, unknown>> };

type Mounted = { readonly name: string; readonly widget: string; readonly props: Readonly<Record<string, Binding>> };

const BAND_TILE = "studio-band";

export function bandBoardOf(app: string): Record<string, unknown> {
	const start = [safeAreaAt("left"), controlMenuOf(app)];
	const end = [AI_BUTTON, safeAreaAt("right")];
	return {
		v: 2,
		tiles: [
			{
				id: BAND_TILE,
				widget: "@studio/band",
				props: {},
				mounts: { start: start.map(mountRowOf), end: end.map(mountRowOf) },
				mounted: Object.fromEntries([...start, ...end].map(({ name, widget, props }) => [name, { widget, props }])),
			},
		],
		layout: { dir: "row", of: [{ dir: "column", keep: true, of: [{ id: BAND_TILE, surface: "none" }] }] },
	};
}

const AI_BUTTON: Mounted = {
	name: "AI button",
	widget: "@studio/ai-button",
	props: { getIsOpen: bound("@studio/is-assistant-open"), toggleAssistant: bound("@studio/toggle-assistant") },
};

function controlMenuOf(app: string): Mounted {
	return {
		name: "Control menu",
		widget: "@studio/control-menu",
		props: {
			getCurrentApp: bound("@studio/current-app", { app }),
			getApps: bound("@studio/apps"),
			openApp: bound("@studio/open-app"),
			createApp: bound("@studio/create-app"),
			editInCanvas: bound("@studio/edit-in-canvas"),
			getIsInCanvas: bound("@studio/is-in-canvas"),
			backToView: bound("@studio/back-to-view"),
		},
	};
}

function safeAreaAt(side: "left" | "right"): Mounted {
	return {
		name: `Safe area ${side}`,
		widget: "@studio/safe-area",
		props: { getSide: bound("@core/typed-value", { value: side }) },
	};
}

function mountRowOf({ name, widget }: Mounted): { readonly name: string; readonly widget: string } {
	return { name, widget };
}

function bound(implementation: string, fields: Readonly<Record<string, unknown>> = {}): Binding {
	return { implementation, fields };
}
