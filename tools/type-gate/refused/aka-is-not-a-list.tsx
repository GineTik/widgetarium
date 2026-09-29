import { IListGateway, createWidget, z } from "widgetarium";

const DaySchema = z.object({ done: z.number().meta({ aka: "kept" }) });

export default createWidget({
	inject: { days: IListGateway.of(DaySchema) },
	draw: () => null,
});
