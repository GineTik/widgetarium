import { defineManifest, defineProp } from "widgetarium";

export const manifest = defineManifest({
	title: "Wrong control",
	description: "A number drawn as an icon.",
	props: {
		pageSize: defineProp<number>()({ default: 10, control: "icon" }),
	},
});
