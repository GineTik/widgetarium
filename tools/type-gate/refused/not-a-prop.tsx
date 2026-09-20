import { defineManifest } from "widgetarium";

export const manifest = defineManifest({
	title: "Not a prop",
	description: "A prop written as a bare object.",
	props: {
		entries: { default: [], writes: ["create"] },
	},
});
