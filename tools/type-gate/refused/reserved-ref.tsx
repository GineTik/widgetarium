import { defineManifest, defineProp } from "widgetarium";

type Entry = { title: string; ref: string };

export const manifest = defineManifest({
	title: "Reserved ref",
	description: "A row type spelling ref as a plain string.",
	props: {
		entries: defineProp<Entry[]>()({ default: [] }),
	},
});
