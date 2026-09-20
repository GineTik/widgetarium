import { defineManifest, defineProp } from "widgetarium";

export const manifest = defineManifest({
	title: "Default does not fit",
	description: "A number where the type says a line.",
	props: {
		heading: defineProp<string>()({ default: 5 }),
	},
});
