import type { WidgetCatalogue } from "../gateway/host.js";

export const NO_CATALOGUE: WidgetCatalogue = {
	canOpen: false,
	open: async () => {
		console.warn("Widgetarium: no widget catalogue is open here, so nothing was picked");
		return null;
	},
};
