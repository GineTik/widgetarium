import { IListGateway, createWidget } from "widgetarium";
import { z } from "zod";

const DaySchema = z.object({ done: z.number().meta({ aka: "kept" }) });

export default createWidget({
	inject: { days: IListGateway.of(DaySchema) },
	draw: () => null,
});
