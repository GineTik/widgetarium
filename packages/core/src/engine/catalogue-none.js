export const NO_CATALOGUE = {
	canOpen: false,
	open: async () => {
		console.warn("Widgetarium: no widget catalogue is open here, so nothing was picked");
		return null;
	},
};
