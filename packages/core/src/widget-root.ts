import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement, ReactNode } from "react";
import { Card } from "@widgetarium/kit";

interface SlotLook {
	readonly surface: string;
	readonly isCard: boolean;
}

export type SlotDraw<Given> = (given: Given) => ReactNode;

export type WidgetRootProps = HTMLAttributes<HTMLDivElement> & {
	readonly defaultBackgroundType?: unknown;
	readonly defaultRounded?: unknown;
	readonly background?: unknown;
};

export interface AppearanceOverrideProps {
	readonly children?: ReactNode;
}

const IGNORED_APPEARANCE = "Widgetarium: WidgetRoot ignores {prop} — the board decides a widget's background now.";
const warnedAbout = new Set<string>();

export function rootWidget(drawn: ReactNode): ReactElement {
	return h("div", { className: "wg-widget-root" }, drawn);
}

export function withSlotSurface<Given>(
	draw: SlotDraw<Given>,
	{ surface, isCard }: SlotLook,
): SlotDraw<Given> & SlotLook {
	const drawn: SlotDraw<Given> = isCard
		? (given) => h(Card, { type: surface, className: "wg-slot" }, draw(given))
		: draw;
	return Object.assign(drawn, { surface, isCard });
}

// TODO: delete WidgetRoot and the inert exports below at the next widget api
export function WidgetRoot({
	defaultBackgroundType,
	defaultRounded,
	background,
	...props
}: WidgetRootProps): ReactElement {
	const asked = { defaultBackgroundType, defaultRounded, background };
	for (const [prop, value] of Object.entries(asked)) {
		if (value === undefined || warnedAbout.has(prop)) continue;
		warnedAbout.add(prop);
		console.warn(IGNORED_APPEARANCE.replace("{prop}", prop));
	}
	return h("div", props);
}

export const ROUNDED: readonly string[] = ["base", "full", "none"];
export const BACKGROUND: readonly string[] = ["none"];

export function AppearanceOverride({ children }: AppearanceOverrideProps): ReactNode {
	return children;
}

export function useWidgetRounded(): "base" {
	return "base";
}

export function useBackgroundType(): "none" {
	return "none";
}
