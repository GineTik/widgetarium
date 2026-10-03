import type { WidgetCatalogue } from "../gateway/host.js";
import { NO_CATALOGUE } from "./catalogue-none.js";
import { CATALOGUE_REQUESTS } from "./catalogue-requests.js";
import type { CatalogueMode } from "./catalogue-requests.js";

interface CatalogueAbility {
	readonly can?: { readonly catalogue?: boolean } | undefined;
}

const CATALOGUE_MODES: readonly CatalogueMode[] = ["browse", "place", "fill", "text", "mount", "template"];

export function widgetCatalogue(host: CatalogueAbility | null | undefined): WidgetCatalogue {
	if (host?.can?.catalogue === false) return NO_CATALOGUE;
	return {
		canOpen: true,
		open: (options) =>
			CATALOGUE_REQUESTS.ask({
				mode: CATALOGUE_MODES.find((known) => known === (options?.mode ?? "mount")) ?? "browse",
				kind: options?.kind === "inline" ? "inline" : "board",
			}),
	};
}
