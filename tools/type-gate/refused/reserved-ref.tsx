import { IListGateway, defineProps, z } from "widgetarium";

const Entry = z.object({ title: z.string(), ref: z.string() });

export const props = defineProps({
	entries: IListGateway.of(Entry),
});
