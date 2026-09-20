import { defineManifest, defineProp } from "widgetarium";
import type { PropsOf } from "widgetarium";

type Entry = { title: string };

export const manifest = defineManifest({
	title: "Undeclared verb",
	description: "A widget calling a verb it never declared.",
	props: {
		heading: defineProp<string>()({ default: "To do" }),
		entries: defineProp<Entry[]>()({ default: [], writes: ["create"] }),
	},
});

declare const props: PropsOf<typeof manifest>;

export const removing = props.entries.remove;
export const writingAValue = props.heading.update;
