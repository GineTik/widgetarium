import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Segmented } from "@widgetarium/kit";
import type { DrawnScreen } from "./design-canvas-shapes.js";

export interface VariantPick {
	readonly variants: Readonly<Record<string, string>>;
	readonly onVariant: (page: string, screen: string) => void;
}

const VARIANT = /^(.+) · ([A-Z])$/;
const PICKED = "Picked";

export function pageOfScreen(name: string): string {
	return VARIANT.exec(name)?.[1] ?? name;
}

export function screensOfPage(screens: readonly DrawnScreen[], page: string): DrawnScreen[] {
	return screens.filter((screen) => pageOfScreen(screen.name) === page);
}

export function shownVariantOf(screens: readonly DrawnScreen[], page: string, pick: VariantPick): DrawnScreen[] {
	const ofPage = screensOfPage(screens, page);
	if (ofPage.length < 2) return ofPage;
	const chosen = ofPage.find((screen) => screen.name === pick.variants[page]) ?? ofPage[0];
	return chosen ? [chosen] : [];
}

export function VariantSwitch({
	screens,
	page,
	pick,
}: {
	screens: readonly DrawnScreen[];
	page: string;
	pick: VariantPick;
}): ReactElement | null {
	const ofPage = screensOfPage(screens, page);
	if (ofPage.length < 2) return null;
	const shown = shownVariantOf(screens, page, pick)[0]?.name ?? "";
	return h(Segmented<string>, {
		size: "m",
		items: ofPage.map((screen) => ({ value: screen.name, label: VARIANT.exec(screen.name)?.[2] ?? PICKED })),
		value: shown,
		onValueChange: (screen: string) => pick.onVariant(page, screen),
		className: "wg-design-variants",
	});
}
