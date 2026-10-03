import { IValueGateway, createWidget, z } from "widgetarium";

export default createWidget({
	inject: { heading: IValueGateway.of(z.string().default(5)).pick("get") },
	draw: () => null,
});
