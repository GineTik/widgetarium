import { IListGateway, createWidget } from "widgetarium";
import { z } from "zod";

const Entry = z.object({ title: z.string(), ref: z.string() });

export default createWidget({
	inject: { entries: IListGateway.of(Entry) },
	draw: () => null,
});
