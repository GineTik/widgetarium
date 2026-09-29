import { defineProps } from "widgetarium";

export const props = defineProps({
	entries: { default: [], writes: ["create"] },
});
