import type { WidgetDefinition } from "@widgetarium/core/registry.js";

const CARD_PX = { narrow: 400, wide: 800 } as const;
const WIDE_FROM_PX = 560;

export function cardPxOf(definition: WidgetDefinition | null): number {
	return isWide(definition?.manifest["preferredSize"]) ? CARD_PX.wide : CARD_PX.narrow;
}

function isWide(size: unknown): boolean {
	if (typeof size !== "object" || size === null || !("preferredWidth" in size)) return false;
	const preferred = size.preferredWidth;
	return preferred === "full" || (typeof preferred === "number" && preferred >= WIDE_FROM_PX);
}
