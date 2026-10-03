import { createWidget } from "widgetarium";

export default createWidget({
	inject: { entries: { default: [], writes: ["create"] } },
	draw: () => null,
});
