import { ICrudGateway, defineProps, z } from "widgetarium";
import type { DrawnProps } from "widgetarium";

const Entry = z.object({ title: z.string() });

const props = defineProps({
	entries: ICrudGateway.of(Entry).pick("update"),
});

declare const drawn: DrawnProps<typeof props>;

export const listing = drawn.entries.list;
