import { IQuery, createWidget } from "widgetarium";

export const Refused = createWidget({
	inject: { tasks: IQuery },
	draw: () => null,
});
