import { IValueGateway, createWidget } from "widgetarium";
import { z } from "zod";

export default createWidget({
	inject: { heading: IValueGateway.of(z.string().default(5)).pick("get") },
	draw: () => null,
});
