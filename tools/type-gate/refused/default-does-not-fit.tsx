import { IValueGateway, defineProps, z } from "widgetarium";

export const props = defineProps({
	heading: IValueGateway.of(z.string().default(5)).pick("get"),
});
