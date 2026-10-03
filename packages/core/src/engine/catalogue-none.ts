import type { Carrier, WidgetCatalogue, WidgetPreview } from "../gateway/host.js";

export const NO_CATALOGUE: WidgetCatalogue = {
	canOpen: false,
	open: async () => {
		console.warn("Widgetarium: no widget catalogue is open here, so nothing was picked");
		return null;
	},
};

export const NO_PREVIEW: WidgetPreview = { canPreview: false, Drawn: () => null };

export const NO_CARRIER: Carrier = { canCarry: false, lift: async () => null };
