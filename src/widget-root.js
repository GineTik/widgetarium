import { createElement as h } from "react";
import { Card } from "./kit.js";

export function rootedWidget(drawn) {
	return h("div", { className: "wg-widget-root" }, drawn);
}

export function surfacedSlot(draw, { surface, isCard }) {
	const drawn = isCard ? (given) => h(Card, { type: surface, className: "wg-slot" }, draw(given)) : draw;
	return Object.assign(drawn, { surface, isCard });
}

const IGNORED_APPEARANCE = "Widgetarium: WidgetRoot ignores {prop} — the board decides a widget's background now.";
const warnedAbout = new Set();

// TODO: delete WidgetRoot and the inert exports below at the next widget api
export function WidgetRoot({ defaultBackgroundType, defaultRounded, background, ...props }) {
	const asked = { defaultBackgroundType, defaultRounded, background };
	for (const [prop, value] of Object.entries(asked)) {
		if (value === undefined || warnedAbout.has(prop)) continue;
		warnedAbout.add(prop);
		console.warn(IGNORED_APPEARANCE.replace("{prop}", prop));
	}
	return h("div", props);
}

export const ROUNDED = ["base", "full", "none"];
export const BACKGROUND = ["none"];

export function AppearanceOverride({ children }) {
	return children;
}

export function useWidgetRounded() {
	return "base";
}

export function useBackgroundType() {
	return "none";
}
