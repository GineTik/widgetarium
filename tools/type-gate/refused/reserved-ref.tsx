import { IListGateway, createWidget, z } from "widgetarium";

const Entry = z.object({ title: z.string(), ref: z.string() });

export default createWidget({
	inject: { entries: IListGateway.of(Entry) },
	draw: () => null,
});
